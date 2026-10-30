const encoder=new TextEncoder(),cookieName='__Host-kafra_admin',ttl=8*60*60*1000,day=86400000;
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
const unhex=text=>Uint8Array.from(text.match(/../g)??[],n=>parseInt(n,16));
const sha=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const token=()=>btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
export async function passwordHash(password,salt,pepper){
  const key=await crypto.subtle.importKey('raw',encoder.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const material=await crypto.subtle.sign('HMAC',key,encoder.encode(password));
  const input=await crypto.subtle.importKey('raw',material,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},input,256));
}
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;};
const cookie=request=>request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
const superUser=env=>env.KAFRA_ADMIN_USER??'admin';
const superVersion=env=>sha(env.KAFRA_ADMIN_HASH+'|'+env.KAFRA_ADMIN_PEPPER+'|'+superUser(env));
// Owner sessions die when the password, pepper or assigned server changes.
const ownerVersion=(env,owner)=>sha(owner.password_hash+'|'+env.KAFRA_ADMIN_PEPPER+'|'+owner.username+'|'+owner.server_id);
const ownerName=/^[a-z0-9][a-z0-9_.-]{2,31}$/,serverId=/^[a-f0-9]{16}$/,dummyHash='0'.repeat(32)+':'+'0'.repeat(64);
// Printable text (tabs/newlines allowed) within a length bound, or null.
const text=(value,max)=>typeof value==='string'&&value.length>=1&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)?value:null;
async function sessionUser(env,tokenHash){
  const row=await env.DB.prepare('SELECT username,verifier_version FROM kafra_admin_sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();
  if(!row)return null;
  if(row.username===superUser(env))return equal(row.verifier_version,await superVersion(env))?{username:row.username,role:'super_admin'}:null;
  const owner=await env.DB.prepare('SELECT username,password_hash,server_id FROM kafra_owners WHERE username=?').bind(row.username).first();
  if(!owner||!equal(row.verifier_version,await ownerVersion(env,owner)))return null;
  return {username:owner.username,role:'server_owner',serverId:owner.server_id};
}
async function current(request,env){
  const value=cookie(request);if(!/^[A-Za-z0-9_-]{43}$/.test(value??''))return null;
  return sessionUser(env,await sha(value));
}
async function createSession(env,username,verifier){
  const value=token(),now=Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE expires_at<?').bind(now),
    env.DB.prepare('DELETE FROM kafra_admin_attempts WHERE expires_at<?').bind(now),
    env.DB.prepare('INSERT INTO kafra_admin_sessions (token_hash,username,verifier_version,expires_at) VALUES (?,?,?,?)').bind(await sha(value),username,verifier,now+ttl)
  ]);
  return cookieName+'='+value+'; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict';
}
// Verifier for an existing account, used when SSO signs it in without a password.
async function accountVerifier(env,username){
  if(username===superUser(env))return env.KAFRA_ADMIN_HASH&&env.KAFRA_ADMIN_PEPPER?{role:'super_admin',verifier:await superVersion(env)}:null;
  const owner=await env.DB.prepare('SELECT username,password_hash,server_id FROM kafra_owners WHERE username=?').bind(username).first();
  return owner?{role:'server_owner',verifier:await ownerVersion(env,owner)}:null;
}
const b64u=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const home=(fragment,headers={})=>new Response(null,{status:302,headers:{Location:'/#'+fragment,'Cache-Control':'no-store',...headers}});
const label=value=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,100):null;
const providers={
  google:{authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scope:'openid email',pkce:true,extra:{prompt:'select_account'},
    id:env=>env.GOOGLE_CLIENT_ID,secret:env=>env.GOOGLE_CLIENT_SECRET,
    async profile(access){const r=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(5000)});
      const p=r.ok?await r.json():null;if(typeof p?.sub!=='string'||p.email_verified!==true)throw new Error('profile');return {subject:p.sub,label:label(p.email)};}},
  discord:{authorize:'https://discord.com/oauth2/authorize',token:'https://discord.com/api/oauth2/token',scope:'identify',pkce:false,extra:{prompt:'none'},
    id:env=>env.DISCORD_CLIENT_ID,secret:env=>env.DISCORD_CLIENT_SECRET,
    async profile(access){const r=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(5000)});
      const p=r.ok?await r.json():null;if(typeof p?.id!=='string')throw new Error('profile');return {subject:p.id,label:label(p.username)};}}
};
const configured=env=>Object.keys(providers).filter(name=>providers[name].id(env)&&providers[name].secret(env));
async function oauthStart(request,env,name,url){
  const p=providers[name];if(!configured(env).includes(name))return home('sso_error=unavailable');
  const ip=request.headers.get('CF-Connecting-IP')??'local',bucket=Math.floor(Date.now()/900000);
  if(await bump(env,await sha('oauth|'+ip+'|'+bucket),(bucket+1)*900000)>30)return home('sso_error=too_many_attempts');
  const mode=url.searchParams.get('mode')==='link'?'link':'login';let username=null,session=null;
  if(mode==='link'){const user=await current(request,env);if(!user)return home('sso_error=signin_first');username=user.username;session=await sha(cookie(request));}
  const state=token(),verifier=p.pkce?token():null,now=Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM kafra_oauth_states WHERE expires_at<?').bind(now),
    env.DB.prepare('INSERT INTO kafra_oauth_states (state_hash,provider,mode,username,session_hash,verifier,expires_at) VALUES (?,?,?,?,?,?,?)').bind(await sha(state),name,mode,username,session,verifier,now+600000)
  ]);
  const auth=new URL(p.authorize);
  auth.search=new URLSearchParams({client_id:p.id(env),redirect_uri:url.origin+'/api/oauth/'+name+'/callback',response_type:'code',scope:p.scope,state,...p.extra});
  if(verifier){auth.searchParams.set('code_challenge',b64u(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));auth.searchParams.set('code_challenge_method','S256');}
  return new Response(null,{status:302,headers:{Location:auth.href,'Cache-Control':'no-store'}});
}
// The provider redirect is cross-site, so the Strict session cookie is absent here; link mode re-checks the session saved in the state.
async function oauthCallback(env,name,url){
  const p=providers[name];if(!configured(env).includes(name))return home('sso_error=unavailable');
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  if(!/^[A-Za-z0-9_-]{43}$/.test(state??''))return home('sso_error=expired');
  const row=await env.DB.prepare('DELETE FROM kafra_oauth_states WHERE state_hash=? AND provider=? AND expires_at>? RETURNING mode,username,session_hash,verifier').bind(await sha(state),name,Date.now()).first();
  if(!row)return home('sso_error=expired');
  if(!code||code.length>2048)return home('sso_error=cancelled');
  let identity;
  try{
    const form=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:url.origin+'/api/oauth/'+name+'/callback',client_id:p.id(env),client_secret:p.secret(env)});
    if(row.verifier)form.set('code_verifier',row.verifier);
    const response=await fetch(p.token,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:form,signal:AbortSignal.timeout(5000)});
    const grant=response.ok?await response.json():null;if(typeof grant?.access_token!=='string')throw new Error('token');
    identity=await p.profile(grant.access_token);
  }catch{return home('sso_error=provider');}
  if(row.mode==='link'){
    const user=await sessionUser(env,row.session_hash);if(!user||user.username!==row.username)return home('sso_error=signin_first');
    const taken=await env.DB.prepare('SELECT username FROM kafra_identities WHERE provider=? AND subject=?').bind(name,identity.subject).first();
    if(taken&&taken.username!==user.username)return home('sso_error=already_linked');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM kafra_identities WHERE provider=? AND username=?').bind(name,user.username),
      env.DB.prepare('INSERT OR REPLACE INTO kafra_identities (provider,subject,username,label,linked_at) VALUES (?,?,?,?,?)').bind(name,identity.subject,user.username,identity.label,Date.now())
    ]);
    return home('linked='+name);
  }
  const link=await env.DB.prepare('SELECT username FROM kafra_identities WHERE provider=? AND subject=?').bind(name,identity.subject).first();
  const account=link?await accountVerifier(env,link.username):null;if(!account)return home('sso_error=not_linked');
  return home('signed_in',{'Set-Cookie':await createSession(env,link.username,account.verifier)});
}
async function body(request,limit=2048){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('body');
  const reader=request.body?.getReader();if(!reader)throw new Error('body');let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('body');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('body');return data;
}
async function bump(env,key,until){
  return (await env.DB.prepare('INSERT INTO kafra_admin_attempts (bucket_key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,until).first())?.attempts??Infinity;
}
async function dataKey(env){
  if(!/^[A-Za-z0-9_-]{43}$/.test(env.KAFRA_DATA_KEY??''))throw new Error('data_key');
  const raw=Uint8Array.from(atob(env.KAFRA_DATA_KEY.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
  return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
async function seal(env,value,id){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  return hex(iv)+':'+hex(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(id)},await dataKey(env),encoder.encode(value)));
}
async function unseal(env,sealed,id){
  const [iv,data]=sealed.split(':');
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv),additionalData:encoder.encode(id)},await dataKey(env),unhex(data)));
}
function gateUrl(value,env){
  let gate;try{gate=new URL(value);}catch{return null;}
  if(gate.username||gate.password||gate.pathname!=='/'||gate.search||gate.hash||
    (gate.protocol!=='https:'&&!(env.KAFRA_DEV_LOCAL==='1'&&['127.0.0.1','localhost'].includes(gate.hostname))))return null;
  return gate;
}
function httpsUrl(value){let url;try{url=new URL(value);}catch{return null;}return url.protocol==='https:'&&!url.username&&!url.password&&value.length<=500?url.href:null;}
const product=row=>({id:row.id,name:row.name,kafra:!!row.kafra,moro:!!row.moro});
// The env-configured gate is the Super Admin's own server (Ragna Next); it is always listed, and says so until its gate is configured.
async function visibleServers(user,env){
  if(user.role==='server_owner')return (await env.DB.prepare('SELECT id,name,kafra,moro FROM kafra_servers WHERE id=?').bind(user.serverId).all()).results.map(product);
  return [{id:'default',name:env.KAFRA_GATE_NAME||'Main server',kafra:true,moro:false},...(await env.DB.prepare('SELECT id,name,kafra,moro FROM kafra_servers ORDER BY name').all()).results.map(product)];
}
async function serverRow(user,id,env){
  if(!serverId.test(id??'')||(user.role==='server_owner'&&user.serverId!==id))return null;
  return env.DB.prepare('SELECT * FROM kafra_servers WHERE id=?').bind(id).first();
}
// null = not visible to this user (or Kafra Guard not enabled); {} = visible but gate not configured.
async function gateFor(user,id,env){
  if(id==='default'){if(user.role!=='super_admin')return null;return env.KAFRA_GATE_URL&&env.KAFRA_GATE_KEY?{url:env.KAFRA_GATE_URL,key:env.KAFRA_GATE_KEY}:{};}
  const row=await serverRow(user,id,env);if(!row?.kafra)return null;
  return row.gate_url&&row.gate_key?{url:row.gate_url,key:await unseal(env,row.gate_key,id)}:{};
}
// Mobile RO app → Worker. Bearer ingest key per server; data is client-reported, like Kafra Guard module reports.
async function ingest(request,env,path){
  const kind=path==='/api/ingest/moro/crash'?'crash':path==='/api/ingest/moro/heartbeat'?'heartbeat':null;if(!kind)return json({error:'not_found'},404);
  const auth=request.headers.get('Authorization')??'',key=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(key))return json({error:'unauthorized'},401);
  const server=await env.DB.prepare('SELECT id FROM kafra_servers WHERE moro=1 AND moro_key_hash=?').bind(await sha(key)).first();
  if(!server)return json({error:'unauthorized'},401);
  const minute=Math.floor(Date.now()/60000);
  if(await bump(env,await sha('ingest|'+kind+'|'+server.id+'|'+minute),(minute+1)*60000)>(kind==='crash'?60:1200))return json({error:'rate_limited'},429,{'Retry-After':'60'});
  let data;try{data=await body(request,kind==='crash'?16384:1024);}catch{return json({error:'invalid_request'},400);}
  const version=text(data.appVersion,32),os=text(data.os,32),now=Date.now();if(!version||!os)return json({error:'invalid_request'},400);
  if(kind==='heartbeat'){
    const device=text(data.deviceId,128);if(!device)return json({error:'invalid_request'},400);
    await env.DB.prepare('INSERT INTO moro_devices (server_id,device_hash,app_version,os,last_seen) VALUES (?,?,?,?,?) ON CONFLICT(server_id,device_hash) DO UPDATE SET app_version=excluded.app_version,os=excluded.os,last_seen=excluded.last_seen')
      .bind(server.id,await sha(server.id+'|'+device),version,os,now).run();
    return json({ok:true});
  }
  const message=text(data.message,500),stack=data.stack==null?null:text(data.stack,12000),model=data.model==null?null:text(data.model,64);
  if(!message||(data.stack!=null&&!stack)||(data.model!=null&&!model))return json({error:'invalid_request'},400);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO moro_crashes (server_id,app_version,os,model,message,stack,created_at) VALUES (?,?,?,?,?,?,?)').bind(server.id,version,os,model,message,stack,now),
    env.DB.prepare('DELETE FROM moro_crashes WHERE server_id=? AND id NOT IN (SELECT id FROM moro_crashes WHERE server_id=? ORDER BY id DESC LIMIT 500)').bind(server.id,server.id)
  ]);
  return json({ok:true},201);
}
async function moroDashboard(user,id,env){
  const row=await serverRow(user,id,env);if(!row?.moro)return json({error:'server_not_found'},404);
  const now=Date.now(),q=(sql,...args)=>env.DB.prepare(sql).bind(id,...args);
  await q('DELETE FROM moro_devices WHERE server_id=? AND last_seen<?',now-30*day).run();
  const [builds,online,active,versions,crashes,recent]=await Promise.all([
    q('SELECT id,version,url,notes,created_at FROM moro_builds WHERE server_id=? ORDER BY created_at DESC LIMIT 20').all(),
    q('SELECT COUNT(*) AS n FROM moro_devices WHERE server_id=? AND last_seen>?',now-5*60000).first(),
    q('SELECT COUNT(*) AS n FROM moro_devices WHERE server_id=? AND last_seen>?',now-day).first(),
    q('SELECT app_version AS version,COUNT(*) AS devices FROM moro_devices WHERE server_id=? AND last_seen>? GROUP BY app_version ORDER BY devices DESC LIMIT 20',now-day).all(),
    q('SELECT COUNT(*) AS n FROM moro_crashes WHERE server_id=? AND created_at>?',now-day).first(),
    q('SELECT id,app_version,os,model,message,stack,created_at FROM moro_crashes WHERE server_id=? ORDER BY id DESC LIMIT 50').all()
  ]);
  return json({server:{id,name:row.name},license:{plan:row.moro_plan,expiresAt:row.moro_expires,active:!row.moro_expires||row.moro_expires>now},
    builds:builds.results.map(b=>({id:b.id,version:b.version,url:b.url,notes:b.notes,publishedAt:b.created_at})),
    stats:{online:online.n,devices24h:active.n,crashes24h:crashes.n,versions:versions.results},
    crashes:recent.results.map(c=>({id:c.id,appVersion:c.app_version,os:c.os,model:c.model,message:c.message,stack:c.stack,at:c.created_at})),updatedAt:now});
}
async function adminRoutes(request,env,path){
  if(path==='/api/admin/servers'&&request.method==='GET'){
    const servers=(await env.DB.prepare('SELECT id,name,kafra,gate_url,moro,moro_plan,moro_expires,moro_key_hash,created_at FROM kafra_servers ORDER BY name').all()).results;
    const owners=(await env.DB.prepare('SELECT username,server_id,created_at FROM kafra_owners ORDER BY username').all()).results;
    return json({servers:servers.map(s=>({...product(s),gateUrl:s.gate_url,moroPlan:s.moro_plan,moroExpires:s.moro_expires,moroKey:!!s.moro_key_hash,createdAt:s.created_at,
      owners:owners.filter(o=>o.server_id===s.id).map(o=>({username:o.username,createdAt:o.created_at}))}))});
  }
  if(request.method!=='POST')return json({error:'not_found'},404);
  let data;try{data=await body(request);}catch{return json({error:'invalid_request'},400);}
  const find=async()=>serverId.test(data.id??'')?env.DB.prepare('SELECT * FROM kafra_servers WHERE id=?').bind(data.id).first():null;
  if(path==='/api/admin/servers'){
    const name=typeof data.name==='string'?text(data.name.trim(),60):null;if(!name||/[\n\r\t]/.test(name))return json({error:'invalid_name'},400);
    const id=hex(crypto.getRandomValues(new Uint8Array(8)));
    await env.DB.prepare('INSERT INTO kafra_servers (id,name,created_at) VALUES (?,?,?)').bind(id,name,Date.now()).run();
    return json({id,name},201);
  }
  if(path==='/api/admin/servers/kafra'){
    const row=await find();if(!row)return json({error:'invalid_server'},400);
    if(data.enabled!==true){await env.DB.prepare('UPDATE kafra_servers SET kafra=0 WHERE id=?').bind(row.id).run();return json({ok:true});}
    const gate=typeof data.gateUrl==='string'?gateUrl(data.gateUrl.trim(),env):null;if(!gate)return json({error:'invalid_gate_url'},400);
    const key=typeof data.gateKey==='string'?data.gateKey.trim().toLowerCase():'';
    if(key?!/^[a-f0-9]{64}$/.test(key):!row.gate_key)return json({error:'invalid_gate_key'},400);
    let sealed=row.gate_key;if(key){try{sealed=await seal(env,key,row.id);}catch{return json({error:'data_key_not_configured'},503);}}
    await env.DB.prepare('UPDATE kafra_servers SET kafra=1,gate_url=?,gate_key=? WHERE id=?').bind(gate.origin+'/',sealed,row.id).run();
    return json({ok:true});
  }
  if(path==='/api/admin/servers/moro'){
    const row=await find();if(!row)return json({error:'invalid_server'},400);
    if(data.enabled!==true){await env.DB.prepare('UPDATE kafra_servers SET moro=0 WHERE id=?').bind(row.id).run();return json({ok:true});}
    const plan=data.plan==null||data.plan===''?null:text(String(data.plan).trim(),40);if(data.plan&&!plan)return json({error:'invalid_plan'},400);
    let expires=null;
    if(data.expiresAt){if(!/^\d{4}-\d{2}-\d{2}$/.test(data.expiresAt)||!Number.isFinite(Date.parse(data.expiresAt+'T23:59:59Z')))return json({error:'invalid_expiry'},400);expires=Date.parse(data.expiresAt+'T23:59:59Z');}
    // The ingest key goes into the MoRo APK; it is returned once and only its hash is stored.
    let ingestKey=null,keyHash=row.moro_key_hash;if(!keyHash||data.rotateKey===true){ingestKey=token();keyHash=await sha(ingestKey);}
    await env.DB.prepare('UPDATE kafra_servers SET moro=1,moro_plan=?,moro_expires=?,moro_key_hash=? WHERE id=?').bind(plan,expires,keyHash,row.id).run();
    return json({ok:true,ingestKey});
  }
  if(path==='/api/admin/servers/delete'){
    if(!serverId.test(data.id??''))return json({error:'invalid_id'},400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE username IN (SELECT username FROM kafra_owners WHERE server_id=?)').bind(data.id),
      env.DB.prepare('DELETE FROM kafra_identities WHERE username IN (SELECT username FROM kafra_owners WHERE server_id=?)').bind(data.id),
      ...['kafra_owners','moro_builds','moro_devices','moro_crashes'].map(table=>env.DB.prepare('DELETE FROM '+table+' WHERE server_id=?').bind(data.id)),
      env.DB.prepare('DELETE FROM kafra_servers WHERE id=?').bind(data.id)
    ]);
    return json({ok:true});
  }
  if(path==='/api/admin/moro/builds'){
    if(!serverId.test(data.serverId??'')||!await env.DB.prepare('SELECT id FROM kafra_servers WHERE id=? AND moro=1').bind(data.serverId).first())return json({error:'invalid_server'},400);
    const version=typeof data.version==='string'?text(data.version.trim(),32):null,url=typeof data.url==='string'?httpsUrl(data.url.trim()):null;
    const notes=data.notes==null||data.notes===''?null:text(String(data.notes),1000);
    if(!version)return json({error:'invalid_version'},400);if(!url)return json({error:'invalid_build_url'},400);if(data.notes&&!notes)return json({error:'invalid_notes'},400);
    await env.DB.prepare('INSERT INTO moro_builds (server_id,version,url,notes,created_at) VALUES (?,?,?,?,?)').bind(data.serverId,version,url,notes,Date.now()).run();
    return json({ok:true},201);
  }
  if(path==='/api/admin/moro/builds/delete'){
    if(!Number.isSafeInteger(data.id))return json({error:'invalid_id'},400);
    await env.DB.prepare('DELETE FROM moro_builds WHERE id=?').bind(data.id).run();return json({ok:true});
  }
  if(path==='/api/admin/owners'){
    if(typeof data.username!=='string'||!ownerName.test(data.username)||equal(data.username,superUser(env)))return json({error:'invalid_username'},400);
    if(typeof data.password!=='string'||data.password.length<12||data.password.length>256)return json({error:'weak_password'},400);
    if(!serverId.test(data.serverId??'')||!await env.DB.prepare('SELECT id FROM kafra_servers WHERE id=?').bind(data.serverId).first())return json({error:'invalid_server'},400);
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash=salt+':'+await passwordHash(data.password,salt,env.KAFRA_ADMIN_PEPPER);
    try{await env.DB.prepare('INSERT INTO kafra_owners (username,password_hash,server_id,created_at) VALUES (?,?,?,?)').bind(data.username,hash,data.serverId,Date.now()).run();}
    catch{return json({error:'username_taken'},409);}
    return json({username:data.username,serverId:data.serverId},201);
  }
  if(path==='/api/admin/owners/delete'){
    if(typeof data.username!=='string'||!ownerName.test(data.username))return json({error:'invalid_username'},400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE username=?').bind(data.username),
      env.DB.prepare('DELETE FROM kafra_identities WHERE username=?').bind(data.username),
      env.DB.prepare('DELETE FROM kafra_owners WHERE username=?').bind(data.username)
    ]);
    return json({ok:true});
  }
  return json({error:'not_found'},404);
}
export async function adminApi(request,env){
  const url=new URL(request.url),path=url.pathname;
  // App-to-Worker telemetry carries no browser Origin; it authenticates with the server's ingest key instead.
  if(path.startsWith('/api/ingest/')&&request.method==='POST')return ingest(request,env,path);
  if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'origin_denied'},403);
  if(path==='/api/login'&&request.method==='POST'){
    if(!env.KAFRA_ADMIN_HASH||!env.KAFRA_ADMIN_PEPPER||env.KAFRA_ADMIN_PEPPER.length<32)return json({error:'admin_not_configured'},503);
    let data;try{data=await body(request);}catch{return json({error:'invalid_request'},400);}
    if(typeof data.username!=='string'||typeof data.password!=='string'||data.username.length>64||data.password.length>256)return json({error:'invalid_credentials'},401);
    const bucket=Math.floor(Date.now()/900000),until=(bucket+1)*900000;
    const ip=request.headers.get('CF-Connecting-IP')??'local';
    for(const [scope,limit] of [['global',100],[ip,10]]){
      if(await bump(env,await sha(env.KAFRA_ADMIN_PEPPER+'|'+scope+'|'+bucket),until)>limit)return json({error:'too_many_attempts'},429,{'Retry-After':String(Math.ceil((until-Date.now())/1000))});
    }
    let verifier=null,role;
    if(equal(data.username,superUser(env))){
      const [salt,expected]=env.KAFRA_ADMIN_HASH.split(':');
      if(!/^[a-f0-9]{32}$/.test(salt??'')||!/^[a-f0-9]{64}$/.test(expected??''))return json({error:'admin_not_configured'},503);
      if(equal(await passwordHash(data.password,salt,env.KAFRA_ADMIN_PEPPER),expected)){verifier=await superVersion(env);role='super_admin';}
    }else{
      const owner=ownerName.test(data.username)?await env.DB.prepare('SELECT username,password_hash,server_id FROM kafra_owners WHERE username=?').bind(data.username).first():null;
      // Hash even for unknown users so response time does not reveal which owner names exist.
      const [salt,expected]=(owner?.password_hash??dummyHash).split(':');
      const actual=await passwordHash(data.password,salt,env.KAFRA_ADMIN_PEPPER);
      if(owner&&equal(actual,expected)){verifier=await ownerVersion(env,owner);role='server_owner';}
    }
    if(!verifier)return json({error:'invalid_credentials'},401);
    return json({username:data.username,role},200,{'Set-Cookie':await createSession(env,data.username,verifier)});
  }
  const oauth=path.match(/^\/api\/oauth\/(google|discord)\/(start|callback)$/);
  if(oauth&&request.method==='GET')return oauth[2]==='start'?oauthStart(request,env,oauth[1],url):oauthCallback(env,oauth[1],url);
  if(path==='/api/providers'&&request.method==='GET')return json({providers:configured(env)});
  const user=await current(request,env);if(!user)return json({error:'unauthorized'},401);
  if(path==='/api/me'&&request.method==='GET'){
    const identities=(await env.DB.prepare('SELECT provider,label,linked_at FROM kafra_identities WHERE username=?').bind(user.username).all()).results;
    return json({username:user.username,role:user.role,servers:await visibleServers(user,env),providers:configured(env),
      identities:identities.map(i=>({provider:i.provider,label:i.label,linkedAt:i.linked_at}))});
  }
  if(path==='/api/identities/unlink'&&request.method==='POST'){
    let data;try{data=await body(request);}catch{return json({error:'invalid_request'},400);}
    if(!Object.hasOwn(providers,data.provider??''))return json({error:'invalid_provider'},400);
    await env.DB.prepare('DELETE FROM kafra_identities WHERE provider=? AND username=?').bind(data.provider,user.username).run();return json({ok:true});
  }
  if(path==='/api/logout'&&request.method==='POST'){
    await env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE token_hash=?').bind(await sha(cookie(request))).run();
    return json({ok:true},200,{'Set-Cookie':cookieName+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
  }
  if(path.startsWith('/api/admin/'))return user.role==='super_admin'?adminRoutes(request,env,path):json({error:'forbidden'},403);
  if(path==='/api/moro'&&request.method==='GET')return moroDashboard(user,url.searchParams.get('server')??user.serverId,env);
  if(request.method!=='GET'||!['/api/sessions','/api/modules'].includes(path))return json({error:'not_found'},404);
  let target;
  try{target=await gateFor(user,url.searchParams.get('server')??(user.role==='server_owner'?user.serverId:'default'),env);}
  catch{return json({error:'data_key_not_configured'},503);}
  if(!target)return json({error:'server_not_found'},404);
  if(!target.url||!target.key)return json({error:'gate_not_configured'},503);
  const gate=gateUrl(target.url,env);if(!gate)return json({error:'gate_not_configured'},503);
  const upstream=new URL('/internal/owner/'+path.slice(5),gate);
  if(path==='/api/modules'){
    const id=url.searchParams.get('id');if(!/^[a-f0-9]{32}$/.test(id??''))return json({error:'invalid_id'},400);upstream.searchParams.set('id',id);
  }else{
    const offset=Number(url.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0||offset>10000)return json({error:'invalid_offset'},400);upstream.searchParams.set('offset',String(offset));
  }
  try{
    const response=await fetch(upstream,{headers:{Authorization:'Bearer '+target.key},redirect:'error',signal:AbortSignal.timeout(4000)});
    if(!response.ok)return json({error:response.status===404&&path==='/api/modules'?'session_closed':'gate_unavailable'},response.status===404&&path==='/api/modules'?404:502);
    const reader=response.body.getReader();let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();throw new Error('response_size');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return json(JSON.parse(new TextDecoder().decode(bytes)));
  }catch{return json({error:'gate_unavailable'},502);}
}
