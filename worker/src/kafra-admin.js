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
const memberVersion=(env,member)=>sha('member|'+member.username+'|'+member.created_at+'|'+env.KAFRA_ADMIN_PEPPER);
const ownerName=/^[a-z0-9][a-z0-9_.-]{2,31}$/,serverId=/^[a-f0-9]{16}$/,dummyHash='0'.repeat(32)+':'+'0'.repeat(64);
// Printable text (tabs/newlines allowed) within a length bound, or null.
const text=(value,max)=>typeof value==='string'&&value.length>=1&&value.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)?value:null;
async function sessionUser(env,tokenHash){
  const row=await env.DB.prepare('SELECT username,verifier_version FROM kafra_admin_sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();
  if(!row)return null;
  if(row.username===superUser(env))return equal(row.verifier_version,await superVersion(env))?{username:row.username,role:'super_admin'}:null;
  const owner=await env.DB.prepare('SELECT username,password_hash,server_id FROM kafra_owners WHERE username=?').bind(row.username).first();
  if(owner)return equal(row.verifier_version,await ownerVersion(env,owner))?{username:owner.username,role:'server_owner',serverId:owner.server_id}:null;
  const member=await env.DB.prepare('SELECT username,name,created_at FROM kafra_members WHERE username=?').bind(row.username).first();
  return member&&equal(row.verifier_version,await memberVersion(env,member))?{username:member.username,role:'member',name:member.name}:null;
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
  if(owner)return {role:'server_owner',verifier:await ownerVersion(env,owner)};
  const member=await env.DB.prepare('SELECT username,created_at FROM kafra_members WHERE username=?').bind(username).first();
  return member?{role:'member',verifier:await memberVersion(env,member)}:null;
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
    // A login that only opened an empty member account (no password, no servers) moves to this account; the member is
    // removed once it has no login left. Logins of owner or admin accounts are never taken over.
    const member=taken&&taken.username!==user.username?await env.DB.prepare('SELECT username FROM kafra_members WHERE username=?').bind(taken.username).first():null;
    if(taken&&taken.username!==user.username&&!member)return home('sso_error=already_linked');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM kafra_identities WHERE provider=? AND username=?').bind(name,user.username),
      env.DB.prepare('INSERT OR REPLACE INTO kafra_identities (provider,subject,username,label,linked_at) VALUES (?,?,?,?,?)').bind(name,identity.subject,user.username,identity.label,Date.now()),
      ...(member?[
        env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE username=? AND NOT EXISTS (SELECT 1 FROM kafra_identities WHERE username=?)').bind(member.username,member.username),
        env.DB.prepare('DELETE FROM kafra_members WHERE username=? AND NOT EXISTS (SELECT 1 FROM kafra_identities WHERE username=?)').bind(member.username,member.username)
      ]:[])
    ]);
    return home('linked='+name);
  }
  const link=await env.DB.prepare('SELECT username FROM kafra_identities WHERE provider=? AND subject=?').bind(name,identity.subject).first();
  if(link){const account=await accountVerifier(env,link.username);if(!account)return home('sso_error=not_linked');
    return home('signed_in',{'Set-Cookie':await createSession(env,link.username,account.verifier)});}
  // No account yet: Google/Discord sign-up creates a member with no server access.
  if(!env.KAFRA_ADMIN_PEPPER)return home('sso_error=unavailable');
  const member={username:'member-'+hex(crypto.getRandomValues(new Uint8Array(6))),created_at:Date.now()};
  await env.DB.batch([
    env.DB.prepare('INSERT INTO kafra_members (username,name,created_at) VALUES (?,?,?)').bind(member.username,identity.label,member.created_at),
    env.DB.prepare('INSERT INTO kafra_identities (provider,subject,username,label,linked_at) VALUES (?,?,?,?,?)').bind(name,identity.subject,member.username,identity.label,member.created_at)
  ]);
  return home('signed_in',{'Set-Cookie':await createSession(env,member.username,await memberVersion(env,member))});
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
// Why the gate call failed (HTTP status or fetch error), shown to the signed-in owner; never includes the key.
const unavailable=reason=>json({error:'gate_unavailable',detail:String(typeof reason==='string'?reason:(reason?.name??'Error')+': '+(reason?.message??'')).slice(0,160)},502);
function gateUrl(value,env){
  let gate;try{gate=new URL(value);}catch{return null;}
  if(gate.username||gate.password||gate.pathname!=='/'||gate.search||gate.hash||
    (gate.protocol!=='https:'&&!(env.KAFRA_DEV_LOCAL==='1'&&['127.0.0.1','localhost'].includes(gate.hostname))))return null;
  return gate;
}
function httpsUrl(value){let url;try{url=new URL(value);}catch{return null;}return url.protocol==='https:'&&!url.username&&!url.password&&value.length<=500?url.href:null;}
const product=row=>({id:row.id,name:row.name,kafra:!!row.kafra,moro:!!row.moro,kafraPlan:row.kafra_plan==='pro'?'pro':'basic'});
// Kafra Guard plans: 'basic' (Kafra Guard) and 'pro' (Kafra Guard Pro). Pro adds the protection switch, client limits and
// player module reports; the Worker refuses those calls for Basic servers, the dashboard shows an upgrade card instead.
const proActions=new Set(['policy','modules']);
const licensesSql='CREATE TABLE IF NOT EXISTS kafra_licenses (id INTEGER PRIMARY KEY AUTOINCREMENT, server_id TEXT NOT NULL, license_server TEXT NOT NULL, expires TEXT NOT NULL, max_online INTEGER NOT NULL DEFAULT 0, license TEXT NOT NULL, issued_by TEXT NOT NULL, issued_at INTEGER NOT NULL)';
// Known GameShield.dll builds (Kafra Guard core), registered by the Super Admin by SHA-256 only; the DLL itself is never uploaded.
const coreSql="CREATE TABLE IF NOT EXISTS kafra_core_versions (sha256 TEXT PRIMARY KEY, label TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', latest INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)";
const planReady=new WeakSet();
// Databases created before plans get the column once; servers that already ran Kafra Guard keep every feature (Pro).
async function ensurePlan(env){
  if(planReady.has(env.DB))return;
  try{await env.DB.prepare('SELECT kafra_plan FROM kafra_servers LIMIT 0').all();}
  catch{await env.DB.batch([env.DB.prepare("ALTER TABLE kafra_servers ADD COLUMN kafra_plan TEXT NOT NULL DEFAULT 'basic'"),
    env.DB.prepare("UPDATE kafra_servers SET kafra_plan='pro' WHERE kafra=1")]);}
  await env.DB.batch([env.DB.prepare(licensesSql),env.DB.prepare(coreSql)]);planReady.add(env.DB);
}
// rAthena login-server license, same format as tools/license-gen.mjs: KG1.<b64url(json)>.<b64url(P-256 signature, IEEE-P1363)>.
// realms (optional, always last in the JSON) lists the sub-servers (e.g. renewal, classic) one license covers;
// each login server names its own realm in kafraguard.conf and refuses to start protection if it is not listed.
async function signLicense(env,{server,exp,max,realms=[]}){
  const pem=env.KAFRA_LICENSE_KEY;if(typeof pem!=='string'||!pem.includes('PRIVATE KEY'))throw new Error('license_key');
  const der=Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g,'').replace(/\s+/g,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',der,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const payload=b64u(encoder.encode(JSON.stringify({server,exp,max,iss:new Date().toISOString().slice(0,10),...(realms.length?{realms}:{})})));
  return 'KG1.'+payload+'.'+b64u(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode('KG1.'+payload)));
}
// The env-configured gate (KAFRA_GATE_URL, e.g. Ragna Next) becomes a normal server row on first use, so it can be managed,
// get owners and Mobile RO like any other. Its gate key stays in the Worker secret KAFRA_GATE_KEY unless one is saved in Manage.
const envGate=env=>{const gate=env.KAFRA_GATE_URL?gateUrl(env.KAFRA_GATE_URL,env):null;return gate?gate.origin+'/':null;};
async function ensureEnvServer(env){
  const url=envGate(env);if(!url)return;
  if(await env.DB.prepare('SELECT id FROM kafra_servers WHERE gate_url=?').bind(url).first())return;
  // Same host on another port (e.g. :8443 before the owner API moved behind nginx on 443): keep the row, update its URL.
  const host=new URL(url).hostname,moved=(await env.DB.prepare('SELECT id,gate_url FROM kafra_servers WHERE gate_url IS NOT NULL AND gate_key IS NULL').all()).results.find(r=>{try{return new URL(r.gate_url).hostname===host;}catch{return false;}});
  if(moved){await env.DB.prepare('UPDATE kafra_servers SET gate_url=? WHERE id=?').bind(url,moved.id).run();return;}
  const id=(await sha('env-gate|'+url)).slice(0,16);
  await env.DB.prepare('INSERT OR IGNORE INTO kafra_servers (id,name,kafra,gate_url,created_at) VALUES (?,?,1,?,?)').bind(id,(env.KAFRA_GATE_NAME||'Main server').slice(0,60),url,Date.now()).run();
}
async function visibleServers(user,env){
  if(user.role==='member')return [];
  if(user.role==='server_owner')return (await env.DB.prepare('SELECT id,name,kafra,moro,kafra_plan FROM kafra_servers WHERE id=?').bind(user.serverId).all()).results.map(product);
  await ensureEnvServer(env);
  return [...(await env.DB.prepare('SELECT id,name,kafra,moro,kafra_plan FROM kafra_servers ORDER BY name').all()).results.map(product)];
}
async function serverRow(user,id,env){
  if(!serverId.test(id??'')||(user.role!=='super_admin'&&user.serverId!==id))return null;
  return env.DB.prepare('SELECT * FROM kafra_servers WHERE id=?').bind(id).first();
}
// null = not visible to this user (or Kafra Guard not enabled); {} = visible but gate not configured.
async function gateFor(user,id,env){
  if(id==='default'){if(user.role!=='super_admin')return null;if(!envGate(env))return {};await ensureEnvServer(env);id=(await env.DB.prepare('SELECT id FROM kafra_servers WHERE gate_url=?').bind(envGate(env)).first())?.id;}
  const row=await serverRow(user,id,env);if(!row?.kafra)return null;const plan=row.kafra_plan==='pro'?'pro':'basic';
  if(row.gate_url&&row.gate_key)return {url:row.gate_url,key:await unseal(env,row.gate_key,id),plan};
  return row.gate_url&&row.gate_url===envGate(env)&&env.KAFRA_GATE_KEY?{url:row.gate_url,key:env.KAFRA_GATE_KEY,plan}:{plan};
}
async function coreVersions(env){
  return (await env.DB.prepare('SELECT sha256,label,notes,latest,created_at FROM kafra_core_versions ORDER BY created_at DESC').all()).results
    .map(v=>({sha256:v.sha256,label:v.label,notes:v.notes,latest:!!v.latest,addedAt:v.created_at}));
}
// MoRo player activity (client/src/MoRo/core/activity.js): text/plain JSON without custom headers, so the
// ingest key travels in the path (it ships inside the APK either way). One row per app start (sid).
const moroPlayersSql="CREATE TABLE IF NOT EXISTS moro_players (server_id TEXT NOT NULL, sid TEXT NOT NULL, account_id INTEGER NOT NULL DEFAULT 0, char_id INTEGER NOT NULL DEFAULT 0, char_name TEXT NOT NULL DEFAULT '', device TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '', app_version TEXT NOT NULL DEFAULT '', last_seen INTEGER NOT NULL, PRIMARY KEY (server_id, sid))";
let moroPlayersReady=false;
async function ensureMoroPlayers(env){if(!moroPlayersReady){await env.DB.prepare(moroPlayersSql).run();moroPlayersReady=true;}}
async function moroActivity(request,env,key){
  const cors={'Access-Control-Allow-Origin':'*'};
  if(!/^[A-Za-z0-9_-]{43}$/.test(key))return json({error:'unauthorized'},401,cors);
  const server=await env.DB.prepare('SELECT id FROM kafra_servers WHERE moro=1 AND moro_key_hash=?').bind(await sha(key)).first();
  if(!server)return json({error:'unauthorized'},401,cors);
  const minute=Math.floor(Date.now()/60000);
  if(await bump(env,await sha('ingest|activity|'+server.id+'|'+minute),(minute+1)*60000)>3000)return json({error:'rate_limited'},429,{...cors,'Retry-After':'60'});
  let data;try{const raw=await request.text();if(raw.length>2048)throw new Error('size');data=JSON.parse(raw);}catch{return json({error:'invalid_request'},400,cors);}
  const line=(value,max)=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,max):'';
  const id=value=>Number.isSafeInteger(value)&&value>=0&&value<2**31?value:0;
  if(!/^[a-f0-9]{32}$/.test(data?.sid??'')||!['start','ping','end'].includes(data.ev))return json({error:'invalid_request'},400,cors);
  await ensureMoroPlayers(env);const now=Date.now();
  if(data.ev==='end'){await env.DB.prepare('DELETE FROM moro_players WHERE server_id=? AND sid=?').bind(server.id,data.sid).run();return json({ok:true},200,cors);}
  const version=line(data.ver,64)||line(data.app,32)||'unknown',os=line(data.os,32)||'unknown';
  await env.DB.batch([
    env.DB.prepare('INSERT INTO moro_players (server_id,sid,account_id,char_id,char_name,device,os,app_version,last_seen) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(server_id,sid) DO UPDATE SET account_id=excluded.account_id,char_id=excluded.char_id,char_name=excluded.char_name,device=excluded.device,os=excluded.os,app_version=excluded.app_version,last_seen=excluded.last_seen')
      .bind(server.id,data.sid,id(data.aid),id(data.cid),line(data.name,24),line(data.device,64),os,version,now),
    env.DB.prepare('INSERT INTO moro_devices (server_id,device_hash,app_version,os,last_seen) VALUES (?,?,?,?,?) ON CONFLICT(server_id,device_hash) DO UPDATE SET app_version=excluded.app_version,os=excluded.os,last_seen=excluded.last_seen')
      .bind(server.id,await sha(server.id+'|sid|'+data.sid),version.slice(0,32),os,now)
  ]);
  return json({ok:true},200,cors);
}
// Game server → Worker: who is online from the MoRo app right now, read by the server itself (login.client_platform =
// 'mobile', the flag Odin uses to skip phones). Each report replaces the previous snapshot for that server.
const moroOnlineSql="CREATE TABLE IF NOT EXISTS moro_online (server_id TEXT NOT NULL, char_id INTEGER NOT NULL, account_id INTEGER NOT NULL, userid TEXT NOT NULL DEFAULT '', char_name TEXT NOT NULL DEFAULT '', base_level INTEGER NOT NULL DEFAULT 0, ip TEXT NOT NULL DEFAULT '', reported_at INTEGER NOT NULL, PRIMARY KEY (server_id, char_id))";
let moroOnlineReady=false;
async function ensureMoroOnline(env){if(!moroOnlineReady){await env.DB.prepare(moroOnlineSql).run();moroOnlineReady=true;}}
async function moroServerReport(env,server,data){
  if(!Array.isArray(data?.players)||data.players.length>1000)return json({error:'invalid_request'},400);
  const line=(value,max)=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,max):'';
  const id=value=>Number.isSafeInteger(value)&&value>0&&value<2**31?value:null;
  const ip=value=>typeof value==='string'&&/^[0-9a-fA-F:.]{2,45}$/.test(value)?value:'';
  const rows=[];for(const p of data.players){const charId=id(p?.charId),accountId=id(p?.accountId);if(!charId||!accountId)return json({error:'invalid_request'},400);
    rows.push([charId,accountId,line(p.userid,23),line(p.name,24),Number.isSafeInteger(p.level)&&p.level>=0&&p.level<10000?p.level:0,ip(p.ip)]);}
  await ensureMoroOnline(env);const now=Date.now();
  await env.DB.batch([env.DB.prepare('DELETE FROM moro_online WHERE server_id=?').bind(server.id),
    ...rows.map(r=>env.DB.prepare('INSERT OR REPLACE INTO moro_online (server_id,char_id,account_id,userid,char_name,base_level,ip,reported_at) VALUES (?,?,?,?,?,?,?,?)').bind(server.id,...r,now))]);
  return json({ok:true,players:rows.length});
}
// OTA (live code update) per Mobile RO server. The agent on the update host (worker/tools/moro-ota-agent.py) reports
// what each channel serves and polls for one pending action: promote (copies the canary bundle) or rollback (applies the
// rollback publish-web.ps1 signed on the PC for the live bundle). Both are signed on the PC; the host only copies files.
const moroOtaSql="CREATE TABLE IF NOT EXISTS moro_ota (server_id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT '{}', reported_at INTEGER NOT NULL DEFAULT 0, pending_id TEXT, pending_action TEXT, pending_by TEXT, pending_at INTEGER, result TEXT)";
let moroOtaReady=false;
async function ensureMoroOta(env){if(!moroOtaReady){await env.DB.prepare(moroOtaSql).run();moroOtaReady=true;}}
function otaChannel(value){
  if(!value||typeof value!=='object')return null;
  const line=(v,max)=>typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,'').slice(0,max):null;
  return {version:Number.isSafeInteger(value.version)&&value.version>0?value.version:null,tag:line(value.tag,40),commit:line(value.commit,40),
    builtAt:line(value.builtAt,40),dirty:value.dirty===true};
}
async function moroOtaReport(env,server,data){
  await ensureMoroOta(env);const now=Date.now();
  const state={production:otaChannel(data?.production),canary:otaChannel(data?.canary),rollback:otaChannel(data?.rollback)};
  const row=await env.DB.prepare('SELECT pending_id FROM moro_ota WHERE server_id=?').bind(server.id).first();
  const done=data?.done&&typeof data.done==='object'&&row?.pending_id&&data.done.id===row.pending_id?data.done:null;
  const result=done?JSON.stringify({ok:done.ok===true,message:typeof done.message==='string'?done.message.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,300):'',at:now}):null;
  await env.DB.prepare('INSERT INTO moro_ota (server_id,state,reported_at) VALUES (?,?,?) ON CONFLICT(server_id) DO UPDATE SET state=excluded.state,reported_at=excluded.reported_at')
    .bind(server.id,JSON.stringify(state),now).run();
  if(done)await env.DB.prepare('UPDATE moro_ota SET pending_id=NULL,pending_action=NULL,pending_by=NULL,pending_at=NULL,result=? WHERE server_id=?').bind(result,server.id).run();
  const pending=done?null:await env.DB.prepare('SELECT pending_id AS id,pending_action AS action,pending_at AS at FROM moro_ota WHERE server_id=? AND pending_id IS NOT NULL').bind(server.id).first();
  // A request the agent never picked up within 10 minutes is dropped rather than run late.
  if(pending&&now-pending.at>10*60000){await env.DB.prepare('UPDATE moro_ota SET pending_id=NULL,pending_action=NULL,result=? WHERE server_id=?').bind(JSON.stringify({ok:false,message:'Expired before the update server picked it up',at:now}),server.id).run();return json({ok:true,action:null});}
  return json({ok:true,action:pending?{id:pending.id,action:pending.action}:null});
}
async function moroOtaView(env,id){
  await ensureMoroOta(env);const row=await env.DB.prepare('SELECT * FROM moro_ota WHERE server_id=?').bind(id).first();
  if(!row)return {connected:false};
  const parse=v=>{try{return v?JSON.parse(v):null;}catch{return null;}};
  return {connected:Date.now()-row.reported_at<5*60000,reportedAt:row.reported_at,...parse(row.state),
    pending:row.pending_id?{action:row.pending_action,by:row.pending_by,at:row.pending_at}:null,lastResult:parse(row.result)};
}
// Mobile RO app → Worker. Bearer ingest key per server; data is client-reported, like Kafra Guard module reports.
async function ingest(request,env,path){
  if(path.startsWith('/api/ingest/moro/activity/'))return moroActivity(request,env,path.slice('/api/ingest/moro/activity/'.length));
  const kind=path==='/api/ingest/moro/crash'?'crash':path==='/api/ingest/moro/heartbeat'?'heartbeat':path==='/api/ingest/moro/online'?'online':path==='/api/ingest/moro/ota'?'ota':null;if(!kind)return json({error:'not_found'},404);
  const auth=request.headers.get('Authorization')??'',key=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(key))return json({error:'unauthorized'},401);
  const server=await env.DB.prepare('SELECT id FROM kafra_servers WHERE moro=1 AND moro_key_hash=?').bind(await sha(key)).first();
  if(!server)return json({error:'unauthorized'},401);
  const minute=Math.floor(Date.now()/60000);
  if(await bump(env,await sha('ingest|'+kind+'|'+server.id+'|'+minute),(minute+1)*60000)>({crash:60,online:20,ota:20}[kind]??1200))return json({error:'rate_limited'},429,{'Retry-After':'60'});
  let data;try{data=await body(request,{crash:16384,online:196608}[kind]??1024);}catch{return json({error:'invalid_request'},400);}
  if(kind==='online')return moroServerReport(env,server,data);
  if(kind==='ota')return moroOtaReport(env,server,data);
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
  const [builds,online,active,versions,crashes,recent,inGame,players]=await Promise.all([
    q('SELECT id,version,url,notes,created_at FROM moro_builds WHERE server_id=? ORDER BY created_at DESC LIMIT 20').all(),
    q('SELECT COUNT(*) AS n FROM moro_devices WHERE server_id=? AND last_seen>?',now-5*60000).first(),
    q('SELECT COUNT(*) AS n FROM moro_devices WHERE server_id=? AND last_seen>?',now-day).first(),
    q('SELECT app_version AS version,COUNT(*) AS devices FROM moro_devices WHERE server_id=? AND last_seen>? GROUP BY app_version ORDER BY devices DESC LIMIT 20',now-day).all(),
    q('SELECT COUNT(*) AS n FROM moro_crashes WHERE server_id=? AND created_at>?',now-day).first(),
    q('SELECT id,app_version,os,model,message,stack,created_at FROM moro_crashes WHERE server_id=? ORDER BY id DESC LIMIT 50').all(),
    ensureMoroOnline(env).then(()=>q('SELECT char_id,account_id,userid,char_name,base_level,ip,reported_at FROM moro_online WHERE server_id=? AND reported_at>? ORDER BY char_name LIMIT 500',now-3*60000).all()),
    ensureMoroPlayers(env).then(()=>q("SELECT account_id,char_id,char_name,device,os,app_version,last_seen FROM moro_players WHERE server_id=? AND last_seen>? ORDER BY char_name='',char_name LIMIT 200",now-3*60000).all())
  ]);
  // OTA (what phones run, update / rollback) is Super Admin only; owners get no ota field.
  const ota=user.role==='super_admin'?await moroOtaView(env,id):undefined;
  return json({server:{id,name:row.name},ota,license:{plan:row.moro_plan,expiresAt:row.moro_expires,active:!row.moro_expires||row.moro_expires>now},
    builds:builds.results.map(b=>({id:b.id,version:b.version,url:b.url,notes:b.notes,publishedAt:b.created_at})),
    inGame:inGame.results.map(p=>({charId:p.char_id,accountId:p.account_id,userid:p.userid,name:p.char_name,level:p.base_level,ip:p.ip,reportedAt:p.reported_at})),
    stats:{online:Math.max(online.n,inGame.results.length),devices24h:active.n,crashes24h:crashes.n,versions:versions.results},
    players:players.results.map(p=>({accountId:p.account_id,charId:p.char_id,name:p.char_name,device:p.device,os:p.os,appVersion:p.app_version,lastSeen:p.last_seen})),
    crashes:recent.results.map(c=>({id:c.id,appVersion:c.app_version,os:c.os,model:c.model,message:c.message,stack:c.stack,at:c.created_at})),updatedAt:now});
}
async function adminRoutes(request,env,path){
  if(path==='/api/admin/servers'&&request.method==='GET'){
    await ensureEnvServer(env);
    const servers=(await env.DB.prepare('SELECT id,name,kafra,kafra_plan,gate_url,moro,moro_plan,moro_expires,moro_key_hash,created_at FROM kafra_servers ORDER BY name').all()).results;
    const owners=(await env.DB.prepare('SELECT username,server_id,created_at FROM kafra_owners ORDER BY username').all()).results;
    return json({servers:servers.map(s=>({...product(s),gateUrl:s.gate_url,builtIn:!!s.gate_url&&s.gate_url===envGate(env),moroPlan:s.moro_plan,moroExpires:s.moro_expires,moroKey:!!s.moro_key_hash,createdAt:s.created_at,
      owners:owners.filter(o=>o.server_id===s.id).map(o=>({username:o.username,createdAt:o.created_at}))}))});
  }
  if(path==='/api/admin/core'&&request.method==='GET')return json({versions:await coreVersions(env)});
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
    if(key?!/^[a-f0-9]{64}$/.test(key):!row.gate_key&&!(gate.origin+'/'===envGate(env)&&env.KAFRA_GATE_KEY))return json({error:'invalid_gate_key'},400);
    const plan=data.plan===undefined?(row.kafra_plan==='pro'?'pro':'basic'):data.plan;if(!['basic','pro'].includes(plan))return json({error:'invalid_kafra_plan'},400);
    let sealed=row.gate_key;if(key){try{sealed=await seal(env,key,row.id);}catch{return json({error:'data_key_not_configured'},503);}}
    await env.DB.prepare('UPDATE kafra_servers SET kafra=1,gate_url=?,gate_key=?,kafra_plan=? WHERE id=?').bind(gate.origin+'/',sealed,plan,row.id).run();
    // Basic has no protection switch, so a server moved down from Pro gets protection back on (best effort; reported back).
    let protectionRestored=null;
    if(row.kafra_plan==='pro'&&plan==='basic'){
      try{const target=await gateFor({role:'super_admin'},row.id,env),url=target?.url&&target.key?gateUrl(target.url,env):null;
        const response=url?await fetch(new URL('/internal/owner/policy',url),{method:'POST',headers:{Authorization:'Bearer '+target.key,'Content-Type':'application/json'},body:'{"protection":true}',redirect:'manual',signal:AbortSignal.timeout(4000)}):null;
        protectionRestored=!!response?.ok;}catch{protectionRestored=false;}
    }
    return json({ok:true,plan,protectionRestored});
  }
  if(path==='/api/admin/core'){
    if(!/^[a-f0-9]{64}$/.test(data.sha256??''))return json({error:'invalid_hash'},400);
    const label=typeof data.label==='string'?text(data.label.trim(),40):null,notes=data.notes==null||data.notes===''?'':text(String(data.notes).trim(),200);
    if(!label||notes===null||/[\x00-\x1f\x7f]/.test(label+notes))return json({error:'invalid_core_label'},400);
    if(!await env.DB.prepare('SELECT sha256 FROM kafra_core_versions WHERE sha256=?').bind(data.sha256).first()&&
      (await env.DB.prepare('SELECT COUNT(*) AS n FROM kafra_core_versions').first()).n>=100)return json({error:'core_limit'},409);
    // Only one version is "latest"; marking a new one demotes the previous.
    const latest=data.latest===true;
    await env.DB.batch([...(latest?[env.DB.prepare('UPDATE kafra_core_versions SET latest=0')]:[]),
      env.DB.prepare('INSERT INTO kafra_core_versions (sha256,label,notes,latest,created_at) VALUES (?,?,?,?,?) ON CONFLICT(sha256) DO UPDATE SET label=excluded.label,notes=excluded.notes,latest=MAX(latest,excluded.latest)').bind(data.sha256,label,notes,latest?1:0,Date.now())]);
    return json({versions:await coreVersions(env)});
  }
  if(path==='/api/admin/core/delete'){
    if(!/^[a-f0-9]{64}$/.test(data.sha256??''))return json({error:'invalid_hash'},400);
    await env.DB.prepare('DELETE FROM kafra_core_versions WHERE sha256=?').bind(data.sha256).run();return json({versions:await coreVersions(env)});
  }
  if(path==='/api/admin/license'){
    const row=await find();if(!row?.kafra)return json({error:'invalid_server'},400);
    const server=typeof data.server==='string'?data.server.trim().toLowerCase():'';if(!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(server))return json({error:'invalid_license_server'},400);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data.expiresAt??'')||!Number.isFinite(Date.parse(data.expiresAt+'T23:59:59Z'))||Date.parse(data.expiresAt+'T23:59:59Z')<Date.now())return json({error:'invalid_expiry'},400);
    const max=data.maxOnline??0;if(!Number.isSafeInteger(max)||max<0||max>100000)return json({error:'invalid_max_online'},400);
    const realms=data.realms??[];
    if(!Array.isArray(realms)||realms.length>16||realms.some(r=>typeof r!=='string'||!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(r))||new Set(realms).size!==realms.length)return json({error:'invalid_realms'},400);
    let license;try{license=await signLicense(env,{server,exp:data.expiresAt,max,realms});}catch{return json({error:'license_key_not_configured'},503);}
    await env.DB.prepare('INSERT INTO kafra_licenses (server_id,license_server,expires,max_online,license,issued_by,issued_at) VALUES (?,?,?,?,?,?,?)').bind(row.id,server,data.expiresAt,max,license,superUser(env),Date.now()).run();
    return json({license,server,realms,expiresAt:data.expiresAt,maxOnline:max},201);
  }
  if(path==='/api/admin/licenses'){
    if(!serverId.test(data.id??''))return json({error:'invalid_server'},400);
    const rows=(await env.DB.prepare('SELECT license_server,expires,max_online,license,issued_by,issued_at FROM kafra_licenses WHERE server_id=? ORDER BY id DESC LIMIT 20').bind(data.id).all()).results;
    // Realms are read back from the signed payload, so older rows need no extra column.
    const realmsOf=license=>{try{const r=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(license.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))).realms;return Array.isArray(r)?r.map(String):[];}catch{return [];}};
    return json({licenses:rows.map(r=>({server:r.license_server,realms:realmsOf(r.license),expiresAt:r.expires,maxOnline:r.max_online,license:r.license,issuedBy:r.issued_by,issuedAt:r.issued_at}))});
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
      ...['kafra_owners','kafra_licenses','moro_builds','moro_devices','moro_crashes'].map(table=>env.DB.prepare('DELETE FROM '+table+' WHERE server_id=?').bind(data.id)),
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
  if(path==='/api/admin/moro/ota'){
    if(!serverId.test(data.serverId??'')||!await env.DB.prepare('SELECT id FROM kafra_servers WHERE id=? AND moro=1').bind(data.serverId).first())return json({error:'invalid_server'},400);
    if(!['promote','rollback'].includes(data.action))return json({error:'invalid_action'},400);
    const ota=await moroOtaView(env,data.serverId);
    if(!ota.connected)return json({error:'ota_agent_offline'},409);
    if(ota.pending)return json({error:'ota_busy'},409);
    if(data.action==='promote'&&(!ota.canary?.version||(ota.production?.version&&ota.canary.version<=ota.production.version)))return json({error:'ota_nothing_to_promote'},409);
    if(data.action==='rollback'&&!ota.rollback?.version)return json({error:'ota_no_rollback'},409);
    await env.DB.prepare('UPDATE moro_ota SET pending_id=?,pending_action=?,pending_by=?,pending_at=? WHERE server_id=?').bind(hex(crypto.getRandomValues(new Uint8Array(8))),data.action,superUser(env),Date.now(),data.serverId).run();
    return json({ok:true});
  }
  if(path==='/api/admin/moro/builds/delete'){
    if(!Number.isSafeInteger(data.id))return json({error:'invalid_id'},400);
    await env.DB.prepare('DELETE FROM moro_builds WHERE id=?').bind(data.id).run();return json({ok:true});
  }
  if(path==='/api/admin/owners'){
    if(typeof data.username!=='string'||!ownerName.test(data.username)||data.username.startsWith('member-')||equal(data.username,superUser(env)))return json({error:'invalid_username'},400);
    if(typeof data.password!=='string'||data.password.length<12||data.password.length>256)return json({error:'weak_password'},400);
    if(!serverId.test(data.serverId??'')||!await env.DB.prepare('SELECT id FROM kafra_servers WHERE id=?').bind(data.serverId).first())return json({error:'invalid_server'},400);
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash=salt+':'+await passwordHash(data.password,salt,env.KAFRA_ADMIN_PEPPER);
    try{await env.DB.prepare('INSERT INTO kafra_owners (username,password_hash,server_id,created_at) VALUES (?,?,?,?)').bind(data.username,hash,data.serverId,Date.now()).run();}
    catch{return json({error:'username_taken'},409);}
    return json({username:data.username,serverId:data.serverId},201);
  }
  if(path==='/api/admin/owners/password'){
    if(typeof data.username!=='string'||!ownerName.test(data.username))return json({error:'invalid_username'},400);
    if(typeof data.password!=='string'||data.password.length<12||data.password.length>256)return json({error:'weak_password'},400);
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash=salt+':'+await passwordHash(data.password,salt,env.KAFRA_ADMIN_PEPPER);
    const [updated]=await env.DB.batch([
      env.DB.prepare('UPDATE kafra_owners SET password_hash=? WHERE username=?').bind(hash,data.username),
      env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE username=?').bind(data.username)
    ]);
    return updated.meta.changes?json({ok:true}):json({error:'owner_not_found'},404);
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
  await ensurePlan(env);
  if(path==='/api/me'&&request.method==='GET'){
    const identities=(await env.DB.prepare('SELECT provider,label,linked_at FROM kafra_identities WHERE username=?').bind(user.username).all()).results;
    return json({username:user.username,name:user.name??user.username,role:user.role,servers:await visibleServers(user,env),providers:configured(env),
      identities:identities.map(i=>({provider:i.provider,label:i.label,linkedAt:i.linked_at}))});
  }
  if(path==='/api/identities/unlink'&&request.method==='POST'){
    let data;try{data=await body(request);}catch{return json({error:'invalid_request'},400);}
    if(!Object.hasOwn(providers,data.provider??''))return json({error:'invalid_provider'},400);
    // A member has no password, so the last linked login cannot be removed.
    if(user.role==='member'&&(await env.DB.prepare('SELECT COUNT(*) AS n FROM kafra_identities WHERE username=? AND provider<>?').bind(user.username,data.provider).first()).n===0)return json({error:'last_sign_in'},400);
    await env.DB.prepare('DELETE FROM kafra_identities WHERE provider=? AND username=?').bind(data.provider,user.username).run();return json({ok:true});
  }
  if(path==='/api/logout'&&request.method==='POST'){
    await env.DB.prepare('DELETE FROM kafra_admin_sessions WHERE token_hash=?').bind(await sha(cookie(request))).run();
    return json({ok:true},200,{'Set-Cookie':cookieName+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
  }
  if(path.startsWith('/api/admin/'))return user.role==='super_admin'?adminRoutes(request,env,path):json({error:'forbidden'},403);
  if(path==='/api/moro'&&request.method==='GET')return moroDashboard(user,url.searchParams.get('server')??user.serverId,env);
  // Client limits, kick and ban live on the gate; owners manage their own server, the Super Admin every server.
  const gateActions={'/api/policy':'policy','/api/kick':'kick','/api/ban':'ban','/api/unban':'unban','/api/bans':'bans','/api/rules':'rules','/api/rule':'rule','/api/unrule':'unrule','/api/builds':'builds','/api/build':'build','/api/unbuild':'unbuild','/api/versions':'versions'};
  if(Object.hasOwn(gateActions,path)){
    const action=gateActions[path],write=request.method==='POST';
    const allowed=action==='policy'?['GET','POST']:['bans','rules','builds','versions'].includes(action)?['GET']:['POST'];if(!allowed.includes(request.method))return json({error:'not_found'},404);
    let data=null;if(write){try{data=await body(request,512);}catch{return json({error:'invalid_request'},400);}}
    let payload=null;
    // Limits and the protection switch are saved separately; either one may be sent alone.
    if(action==='policy'&&write){const {maxPerDevice,maxPerNetwork,protection}=data;payload={};
      if(protection!==undefined){if(typeof protection!=='boolean')return json({error:'invalid_protection'},400);payload.protection=protection;}
      if(maxPerDevice!==undefined||maxPerNetwork!==undefined||protection===undefined){
        if(!Number.isSafeInteger(maxPerDevice)||maxPerDevice<1||maxPerDevice>10||!Number.isSafeInteger(maxPerNetwork)||maxPerNetwork<0||maxPerNetwork>100)return json({error:'invalid_limits'},400);
        Object.assign(payload,{maxPerDevice,maxPerNetwork});}}
    if(action==='kick'){if(!/^[a-f0-9]{32}$/.test(data.id??''))return json({error:'invalid_id'},400);payload={id:data.id};}
    if(action==='ban'||action==='unban'){if(!/^[a-f0-9]{64}$/.test(data.deviceId??''))return json({error:'invalid_device'},400);payload={deviceId:data.deviceId};}
    // Module rules by SHA-256: the browser hashes the DLL locally; only name, hash and note reach the gate.
    if(action==='rule'||action==='unrule'){if(!/^[a-f0-9]{64}$/.test(data.sha256??''))return json({error:'invalid_hash'},400);payload={sha256:data.sha256};}
    if(action==='rule'){const name=text(String(data.name??'').trim(),128)??null,note=data.note==null||data.note===''?'':text(String(data.note).trim(),200);
      if(!['allow','block'].includes(data.verdict))return json({error:'invalid_verdict'},400);
      if(name===null||note===null||/[\x00-\x1f\x7f]/.test(name+note))return json({error:'invalid_rule_text'},400);Object.assign(payload,{name,verdict:data.verdict,note});}
    // Client builds: a re-patched EXE or new GameShield.dll is refused until approved by its build hash.
    if(action==='build'||action==='unbuild'){if(!/^[a-f0-9]{64}$/.test(data.build??''))return json({error:'invalid_build'},400);payload={build:data.build};}
    if(action==='build'){const label=data.label==null||data.label===''?'':text(String(data.label).trim(),100);
      if(label===null||/[\x00-\x1f\x7f]/.test(label))return json({error:'invalid_build_label'},400);payload.label=label;
      // Sub-server (realm) the build belongs to when one gate serves several login servers; sent only when set,
      // so gates without realm support keep accepting realm-less approvals.
      const realm=data.realm==null?'':String(data.realm).trim().toLowerCase();if(!/^(|[a-z0-9][a-z0-9_-]{0,31})$/.test(realm))return json({error:'invalid_realm'},400);
      if(realm)payload.realm=realm;}
    if(action==='ban'){const reason=data.reason==null||data.reason===''?'':text(String(data.reason).trim(),200);
      if(reason===null||/[\x00-\x1f\x7f]/.test(reason))return json({error:'invalid_reason'},400);payload.reason=reason;}
    const id=write?data.server:url.searchParams.get('server');
    let target;try{target=await gateFor(user,id??(user.role==='server_owner'?user.serverId:'default'),env);}catch{return json({error:'data_key_not_configured'},503);}
    if(!target)return json({error:'server_not_found'},404);
    if(proActions.has(action)&&target.plan!=='pro')return json({error:'pro_required'},403);
    const gate=target.url&&target.key?gateUrl(target.url,env):null;if(!gate)return json({error:'gate_not_configured'},503);
    const init={headers:{Authorization:'Bearer '+target.key,...(payload?{'Content-Type':'application/json'}:{})},redirect:'manual',signal:AbortSignal.timeout(4000),
      ...(payload?{method:'POST',body:JSON.stringify(payload)}:{})};
    try{
      const response=await fetch(new URL('/internal/owner/'+action,gate),init);
      if(response.status===404&&['kick','unban','unrule'].includes(action))return json({error:{kick:'session_closed',unban:'not_banned',unrule:'rule_not_found'}[action]},404);
      if(response.status===409&&action==='rule')return json({error:'rule_limit'},409);
      if(response.status===409&&action==='build')return json({error:'build_limit'},409);
      if(response.status===404&&action==='unbuild')return json({error:'build_not_approved'},404);
      // Gates older than build approvals answer 404 (owner read) or 401 (unknown owner write).
      if([401,404].includes(response.status)&&['builds','build'].includes(action))return json({error:'builds_unsupported'},400);
      if(response.status===404&&action==='versions')return json({error:'versions_unsupported'},400);
      // A gate older than the protection switch rejects the unknown field.
      if(response.status===400&&action==='build'&&payload.realm)return json({error:'realms_unsupported'},400);
      if(response.status===400)return json({error:action==='policy'?(payload?.protection!==undefined?'protection_unsupported':'invalid_limits'):'invalid_request'},400);
      if(!response.ok)return unavailable('HTTP '+response.status);
      const result=JSON.parse((await response.text()).slice(0,action==='rules'?4194304:131072));
      if(action==='policy')return json({maxPerDevice:result.maxPerDevice,maxPerNetwork:result.maxPerNetwork,networkPrefix:result.networkPrefix,protection:result.protection!==false});
      if(action==='bans')return json({bans:(Array.isArray(result.bans)?result.bans:[]).slice(0,500).map(b=>({deviceId:String(b.deviceId),reason:String(b.reason??''),bannedAt:b.bannedAt??null}))});
      if(action==='builds'){const hash=v=>/^[a-f0-9]{64}$/.test(v??'');
        return json({published:Array.isArray(result.published)?result.published.filter(hash):null,
          approved:(Array.isArray(result.approved)?result.approved:[]).filter(b=>hash(b?.build)).slice(0,200).map(b=>({build:b.build,label:String(b.label??'').slice(0,100),realm:/^[a-z0-9_-]{1,32}$/.test(b.realm??'')?b.realm:'',approvedAt:b.approvedAt??null})),
          pending:(Array.isArray(result.pending)?result.pending:[]).filter(b=>hash(b?.build)).slice(0,50).map(b=>({build:b.build,firstSeen:b.firstSeen??null,lastSeen:b.lastSeen??null,attempts:Number(b.attempts)||0}))});}
      // GameShield.dll per player, labelled from the Super Admin's catalog; 'latest' is the version players should run.
      if(action==='versions'){const known=new Map((await coreVersions(env)).map(v=>[v.sha256,v])),latest=[...known.values()].find(v=>v.latest)??null;
        const versions=(Array.isArray(result.versions)?result.versions:[]).slice(0,200).filter(v=>v&&(v.sha256===null||/^[a-f0-9]{64}$/.test(v.sha256))).map(v=>{const k=known.get(v.sha256);
          return {sha256:v.sha256,label:k?.label??null,players:Number(v.players)||0,status:v.sha256===null?'unreported':k?.latest?'latest':k?'outdated':'unlisted'};});
        return json({players:Number(result.players)||0,latest:latest&&{sha256:latest.sha256,label:latest.label},versions});}
      if(action==='rules')return json({rules:(Array.isArray(result.rules)?result.rules:[]).slice(0,5000).map(r=>({sha256:String(r.sha256),name:String(r.name??''),verdict:r.verdict==='block'?'block':'allow',note:String(r.note??''),addedAt:r.addedAt??null}))});
      return json({ok:true,endedSessions:result.endedSessions??(action==='kick'?1:0)});
    }catch(error){return unavailable(error);}
  }
  if(request.method!=='GET'||!['/api/sessions','/api/modules'].includes(path))return json({error:'not_found'},404);
  let target;
  try{target=await gateFor(user,url.searchParams.get('server')??(user.role==='server_owner'?user.serverId:'default'),env);}
  catch{return json({error:'data_key_not_configured'},503);}
  if(!target)return json({error:'server_not_found'},404);
  if(path==='/api/modules'&&target.plan!=='pro')return json({error:'pro_required'},403);
  if(!target.url||!target.key)return json({error:'gate_not_configured'},503);
  const gate=gateUrl(target.url,env);if(!gate)return json({error:'gate_not_configured'},503);
  const upstream=new URL('/internal/owner/'+path.slice(5),gate);
  if(path==='/api/modules'){
    const id=url.searchParams.get('id');if(!/^[a-f0-9]{32}$/.test(id??''))return json({error:'invalid_id'},400);upstream.searchParams.set('id',id);
  }else{
    const offset=Number(url.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0||offset>10000)return json({error:'invalid_offset'},400);upstream.searchParams.set('offset',String(offset));
  }
  try{
    const response=await fetch(upstream,{headers:{Authorization:'Bearer '+target.key},redirect:'manual',signal:AbortSignal.timeout(4000)});
    if(response.status===404&&path==='/api/modules')return json({error:'session_closed'},404);
    if(!response.ok)return unavailable('HTTP '+response.status);
    const reader=response.body.getReader();let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();throw new Error('response_size');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return json(JSON.parse(new TextDecoder().decode(bytes)));
  }catch(error){return unavailable(error);}
}
