// Keep the admin panel and HttpOnly cookie on the Worker origin, not GitHub Pages.
if(location.hostname==='dartfapper.pro'||location.hostname==='www.dartfapper.pro')location.replace('https://kafra-guard-owner.tatagpriyanugraha.workers.dev/');
const $=id=>document.getElementById(id);let state={sessions:[],offset:0,total:0},user=null,servers=[],server=null,moroServer=null,managed=null,timer;
const roles={super_admin:'Super Admin',server_owner:'Server Owner',member:'Member'};
const errors={invalid_credentials:'Wrong username or password.',too_many_attempts:'Too many attempts. Try again in 15 minutes.',admin_not_configured:'The Super Admin account is not configured on the server.',gate_not_configured:'The gate is not configured yet. No client data is shown.',gate_unavailable:'The gate cannot be reached. Check the service connection.',service_unavailable:'The admin service is not ready. Check the server configuration.',session_closed:'This client session has closed.',server_not_found:'Server not found, or this product is not enabled for it.',forbidden:'Only the Super Admin can do this.',data_key_not_configured:'KAFRA_DATA_KEY is not configured on the Worker.',invalid_name:'Server name is required (60 characters max).',invalid_gate_url:'Gate URL must be an HTTPS root, e.g. https://gate.server.com/.',invalid_gate_key:'Gate owner key must be 64 hex characters.',invalid_username:'Username must be 3–32 lowercase letters, digits, dots, underscores or dashes, and differ from the Super Admin.',weak_password:'Password must be at least 12 characters.',invalid_server:'Pick a valid server.',username_taken:'That username is taken.',invalid_plan:'Plan must be 40 characters or fewer.',invalid_expiry:'Pick a valid expiry date.',invalid_version:'Version is required (32 characters max).',invalid_build_url:'Download URL must be HTTPS.',invalid_notes:'Notes must be 1000 characters or fewer.',last_sign_in:'This is your only way to sign in, so it cannot be unlinked.'};
const ssoErrors={unavailable:'That sign-in option is not set up yet.',too_many_attempts:'Too many attempts. Try again in 15 minutes.',signin_first:'Sign in with your password first, then link it from Settings.',expired:'The sign-in attempt expired. Please try again.',cancelled:'Sign-in was cancelled.',provider:'Google or Discord could not confirm your account. Please try again.',already_linked:'That Google or Discord account is already linked to another user.',not_linked:'That account is no longer available. Please try again.'};
const providerNames={google:'Google',discord:'Discord'};
// OAuth callbacks come back as /#sso_error=…, /#linked=… or /#signed_in; read once, then clear the hash.
const returned=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));if(location.hash)history.replaceState(null,'',location.pathname);
async function api(path,options={}){
  const response=await fetch('/api/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  let data;try{data=await response.json();}catch{throw new Error('Invalid server response.');}
  if(!response.ok){if(response.status===401&&!path.startsWith('login'))showLogin();throw new Error(errors[data.error]??'Request failed. Please try again.');}return data;
}
const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data)});
const views=['dashboard','moro','admin','settings','empty-view'];
function showLogin(){user=null;loadProviders();for(const id of [...views,'account','side-nav','side-label'])$(id).hidden=true;$('login-section').hidden=false;$('side-role').textContent='Not signed in';$('side-note').textContent='One account for everything on dartfapper.';clearInterval(timer);}
function applyAccess(me){
  user=me;renderSettings(me);servers=me.servers;const kafra=servers.filter(s=>s.kafra),moro=servers.filter(s=>s.moro);
  $('nav-kafra').hidden=!kafra.length;$('nav-moro').hidden=!moro.length;$('nav-admin').hidden=me.role!=='super_admin';
  fillPicker('server','server-pick',kafra,'server');fillPicker('moro-server','moro-pick',moro,'moroServer');
}
function showDashboard(me){
  $('login-section').hidden=true;$('account').hidden=false;$('side-nav').hidden=false;$('side-label').hidden=false;
  $('username').textContent=(me.name??me.username)+' / '+(roles[me.role]??me.role);$('side-role').textContent=roles[me.role]??me.role;
  $('side-note').textContent=me.role==='super_admin'?'All servers and owner accounts.':me.role==='member'?'Your dartfapper account.':'Only your server’s products.';
  applyAccess(me);
  view(!$('nav-kafra').hidden?'dashboard':!$('nav-moro').hidden?'moro':me.role==='super_admin'?'admin':'empty-view');
}
function fillPicker(selectId,wrapId,list,key){
  const select=$(selectId),current=key==='server'?server:moroServer;select.replaceChildren(...list.map(s=>new Option(s.name,s.id)));
  const chosen=list.some(s=>s.id===current)?current:list[0]?.id??null;if(key==='server')server=chosen;else moroServer=chosen;
  select.value=chosen??'';$(wrapId).hidden=list.length<2;
}
function view(name){
  for(const id of views)$(id).hidden=id!==name;
  for(const item of document.querySelectorAll('[data-view]'))item.setAttribute('aria-current',String(item.dataset.view===name));
  clearInterval(timer);
  if(name==='dashboard'){timer=setInterval(()=>{if(!document.hidden)load();},15000);load();}
  else if(name==='moro'){timer=setInterval(()=>{if(!document.hidden)loadMoro();},30000);loadMoro();}
  else if(name==='admin')loadAdmin();
  else if(name==='settings')api('me').then(applyAccess).catch(error=>{$('settings-message').textContent=error.message;});
}
async function loadProviders(){
  // Both buttons always show; one not set up on the Worker yet is greyed out.
  let providers=[];try{({providers}=await api('providers'));}catch{}
  for(const name of Object.keys(providerNames)){const button=$('sso-'+name),off=!providers.includes(name);button.classList.toggle('off',off);button.setAttribute('aria-disabled',String(off));button.title=off?providerNames[name]+' sign-in is coming soon':'';}
}
function renderSettings(me){
  for(const row of document.querySelectorAll('[data-connection]')){
    const name=row.dataset.connection,linked=me.identities?.find(i=>i.provider===name),available=me.providers?.includes(name);
    row.querySelector('[data-connection-status]').textContent=linked?'Linked'+(linked.label?' as '+linked.label:'')+' · '+new Date(linked.linkedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):available?'Not linked':'Not available yet';
    const link=row.querySelector('[data-connection-link]');link.hidden=!available;link.textContent=(linked?'Relink ':'Link ')+providerNames[name];
    row.querySelector('[data-connection-unlink]').hidden=!linked;row.classList.toggle('linked',!!linked);
  }
}
function time(value){return value?new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';}
function date(value){return value?new Date(value).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';}
function cell(row,text,code=false){const td=document.createElement('td');const content=code?document.createElement('code'):document.createElement('span');content.textContent=text;td.append(content);row.append(td);return td;}
function link(row,href,label){const td=document.createElement('td'),a=document.createElement('a');a.href=href;a.textContent=label;a.className='table-link';a.rel='noopener noreferrer';a.target='_blank';td.append(a);row.append(td);return td;}
function empty(tbody,text,columns){tbody.replaceChildren();const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=columns;td.className='empty';td.textContent=text;row.append(td);tbody.append(row);}
function render(){
  const tbody=$('sessions');tbody.replaceChildren();const query=$('search').value.trim().toLowerCase();
  const rows=state.sessions.filter(s=>(s.deviceId+' '+s.ip).toLowerCase().includes(query));
  if(!rows.length)empty(tbody,query?'No matches on this page.':'No verified clients are active.',6);
  for(const session of rows){const row=document.createElement('tr');const device=cell(row,session.deviceId.slice(0,16)+'…',true);device.title=session.deviceId;
    cell(row,session.ip);const build=cell(row,session.buildHash.slice(0,12)+'…',true);build.title=session.buildHash;
    cell(row,session.moduleCount===null?'Awaiting report':session.moduleCount+' modules');cell(row,time(session.lastSeen));
    const action=document.createElement('td'),button=document.createElement('button');button.className='quiet';button.textContent='View modules →';button.addEventListener('click',()=>modules(session));action.append(button);row.append(action);tbody.append(row);}
  $('page-info').textContent=state.total?'Showing '+(state.offset+1)+'–'+Math.min(state.offset+state.sessions.length,state.total)+' of '+state.total+' sessions':'0 active sessions';
  $('previous').disabled=state.offset===0;$('next').disabled=state.offset+50>=state.total;
}
async function load(){
  if(!server){$('message').textContent='No server has Kafra Guard enabled.';empty($('sessions'),'No server.',6);return;}
  $('refresh').disabled=true;
  try{const data=await api('sessions?server='+encodeURIComponent(server)+'&offset='+state.offset);state={...state,...data};$('total').textContent=data.total;$('reported').textContent=data.sessions.filter(s=>s.moduleCount!==null).length;$('updated').textContent=time(data.updatedAt);$('message').textContent='';render();}
  catch(error){state={sessions:[],offset:state.offset,total:0};$('message').textContent=error.message;$('total').textContent='—';$('reported').textContent='—';$('updated').textContent='—';empty($('sessions'),'Data unavailable. The panel never shows sample data.',6);}
  finally{$('refresh').disabled=false;}
}
async function modules(session){
  $('module-panel').hidden=false;$('module-title').textContent='Client modules · '+session.ip;empty($('modules'),'Loading client report…',3);$('module-status').textContent='';
  try{const data=await api('modules?server='+encodeURIComponent(server)+'&id='+encodeURIComponent(session.id));
    $('module-status').textContent=data.receivedAt?'Received '+time(data.receivedAt)+(data.truncated?' · List capped at 128 modules.':''):'The client has not sent a module report yet.';
    if(!data.modules.length){empty($('modules'),'No module report for this session yet.',3);return;}
    $('modules').replaceChildren();for(const module of data.modules){const row=document.createElement('tr');cell(row,module.name,true);const status=cell(row,'');
      const badge=document.createElement('span');badge.className='badge'+(module.signature==='verified'?'':' review');badge.textContent=({verified:'Verified',unsigned:'Unsigned',untrusted:'Untrusted',read_error:'Unreadable'})[module.signature]??'Not checked';status.replaceChildren(badge);cell(row,module.sha256??'Hash unavailable',true).className='module-hash';$('modules').append(row);}
  }catch(error){empty($('modules'),error.message,3);}
  $('module-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function loadMoro(){
  if(!moroServer)return;$('moro-refresh').disabled=true;
  try{const data=await api('moro?server='+encodeURIComponent(moroServer));$('moro-message').textContent='';
    $('moro-title').textContent='Mobile RO · '+data.server.name;
    $('moro-plan').textContent=data.license.plan??'Active';$('moro-plan').classList.toggle('expired',!data.license.active);
    $('moro-expiry').textContent=data.license.expiresAt?(data.license.active?'Valid until ':'Expired ')+new Date(data.license.expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'No expiry date';
    $('moro-online').textContent=data.stats.online;$('moro-devices').textContent=data.stats.devices24h;$('moro-crashes').textContent=data.stats.crashes24h;
    const builds=$('moro-builds');if(!data.builds.length)empty(builds,'No builds published yet.',4);else builds.replaceChildren();
    data.builds.forEach((b,i)=>{const row=document.createElement('tr');const v=cell(row,b.version,true);if(i===0){const tag=document.createElement('span');tag.className='badge';tag.textContent='Latest';v.append(' ',tag);}
      cell(row,date(b.publishedAt));cell(row,b.notes??'—').className='notes';link(row,b.url,'Download APK →');builds.append(row);});
    const versions=$('moro-versions');if(!data.stats.versions.length)empty(versions,'No devices have reported in the last 24 hours.',2);else versions.replaceChildren();
    for(const v of data.stats.versions){const row=document.createElement('tr');cell(row,v.version,true);cell(row,String(v.devices));versions.append(row);}
    const crashes=$('moro-crash-list');if(!data.crashes.length)empty(crashes,'No crashes reported.',4);else crashes.replaceChildren();
    for(const c of data.crashes){const row=document.createElement('tr');cell(row,date(c.at));cell(row,c.appVersion,true);cell(row,[c.model,c.os].filter(Boolean).join(' · '));
      const td=document.createElement('td');td.className='crash';
      if(c.stack){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=c.message;pre.textContent=c.stack;details.append(summary,pre);td.append(details);}else td.textContent=c.message;
      row.append(td);crashes.append(row);}
  }catch(error){$('moro-message').textContent=error.message;for(const id of ['moro-plan','moro-online','moro-devices','moro-crashes'])$(id).textContent='—';}
  finally{$('moro-refresh').disabled=false;}
}
function badge(text,on){const b=document.createElement('span');b.className='badge'+(on?'':' wait');b.textContent=text;return b;}
async function loadAdmin(){
  try{const data=await api('admin/servers');$('admin-message').textContent='';
    $('owner-server').replaceChildren(...data.servers.map(s=>new Option(s.name,s.id)));$('owner-form').querySelector('button').disabled=!data.servers.length;
    const tbody=$('server-list');if(!data.servers.length){empty(tbody,'No servers yet. Add the first one above.',4);}else tbody.replaceChildren();
    for(const s of data.servers){const row=document.createElement('tr');cell(row,s.name);
      const products=document.createElement('td');products.className='owner-cell';products.append(badge('Kafra Guard',s.kafra),' ',badge('Mobile RO',s.moro));row.append(products);
      const owners=document.createElement('td');owners.className='owner-cell';
      if(!s.owners.length){const none=document.createElement('span');none.className='muted';none.textContent='No owners yet';owners.append(none);}
      for(const o of s.owners){const chip=document.createElement('span');chip.className='chip';chip.textContent=o.username;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove owner '+o.username;remove.setAttribute('aria-label','Remove owner '+o.username);
        remove.addEventListener('click',()=>confirmed('Remove owner account "'+o.username+'"? Its login sessions are revoked too.',()=>post('admin/owners/delete',{username:o.username})));chip.append(remove);owners.append(chip);}
      row.append(owners);const action=document.createElement('td');action.className='actions';
      const manage=document.createElement('button');manage.className='quiet';manage.textContent='Manage';manage.addEventListener('click',()=>openManage(s));
      const remove=document.createElement('button');remove.className='quiet danger';remove.textContent='Delete';
      remove.addEventListener('click',()=>confirmed('Delete server "'+s.name+'" with its owner accounts, builds and Mobile RO data?',()=>post('admin/servers/delete',{id:s.id})));
      action.append(manage,remove);row.append(action);tbody.append(row);
      if(managed?.id===s.id)openManage(s,false);}
    if(managed&&!data.servers.some(s=>s.id===managed.id)){managed=null;$('manage').hidden=true;}
    applyAccess(await api('me'));
  }catch(error){$('admin-message').textContent=error.message;}
}
function openManage(s,scroll=true){
  managed=s;$('manage').hidden=false;$('manage-title').textContent=s.name;
  $('kafra-enabled').checked=s.kafra;$('kafra-gate').value=s.gateUrl??'';$('kafra-key').value='';$('kafra-key-hint').textContent=s.gateUrl?'Leave empty to keep the stored key.':'Required the first time Kafra Guard is enabled.';
  $('moro-enabled').checked=s.moro;$('moro-plan-input').value=s.moroPlan??'';$('moro-expires-input').value=s.moroExpires?new Date(s.moroExpires).toISOString().slice(0,10):'';$('moro-rotate').checked=false;
  $('build-form').hidden=!s.moro;if(s.moro)loadManageBuilds();
  if(scroll)$('manage').scrollIntoView({behavior:'smooth',block:'start'});
}
async function loadManageBuilds(){
  const tbody=$('manage-builds');
  try{const data=await api('moro?server='+encodeURIComponent(managed.id));if(!data.builds.length){empty(tbody,'No builds published yet.',4);return;}tbody.replaceChildren();
    for(const b of data.builds){const row=document.createElement('tr');cell(row,b.version,true);cell(row,date(b.publishedAt));link(row,b.url,'Open →');
      const td=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.className='quiet danger';remove.textContent='Remove';
      remove.addEventListener('click',()=>confirmed('Remove build '+b.version+'?',()=>post('admin/moro/builds/delete',{id:b.id})));td.append(remove);row.append(td);tbody.append(row);}
  }catch(error){empty(tbody,error.message,4);}
}
async function confirmed(question,action){if(!confirm(question))return;try{await action();await loadAdmin();}catch(error){$('admin-message').textContent=error.message;}}
function submitter(id,send,reset=true){$(id).addEventListener('submit',async event=>{event.preventDefault();const button=$(id).querySelector('button.primary');button.disabled=true;
  try{await send();if(reset)$(id).reset();await loadAdmin();}catch(error){$('admin-message').textContent=error.message;}finally{button.disabled=false;}});}
submitter('server-form',()=>post('admin/servers',{name:$('server-name').value}));
submitter('owner-form',()=>{const password=$('owner-pass').value;$('owner-pass').value='';return post('admin/owners',{serverId:$('owner-server').value,username:$('owner-user').value.trim(),password});});
submitter('kafra-form',()=>post('admin/servers/kafra',{id:managed.id,enabled:$('kafra-enabled').checked,gateUrl:$('kafra-gate').value,gateKey:$('kafra-key').value}),false);
submitter('moro-form',async()=>{const result=await post('admin/servers/moro',{id:managed.id,enabled:$('moro-enabled').checked,plan:$('moro-plan-input').value,expiresAt:$('moro-expires-input').value,rotateKey:$('moro-rotate').checked});
  $('key-output').hidden=!result.ingestKey;$('key-value').textContent=result.ingestKey??'';if(result.ingestKey)$('key-output').scrollIntoView({behavior:'smooth',block:'nearest'});},false);
submitter('build-form',()=>post('admin/moro/builds',{serverId:managed.id,version:$('build-version').value,url:$('build-url').value,notes:$('build-notes').value}));
for(const button of document.querySelectorAll('[data-connection-unlink]'))button.addEventListener('click',async()=>{
  const name=button.closest('[data-connection]').dataset.connection;if(!confirm('Unlink '+providerNames[name]+'? You can still sign in with your password.'))return;
  try{await post('identities/unlink',{provider:name});$('settings-message').textContent=providerNames[name]+' unlinked.';applyAccess(await api('me'));}catch(error){$('settings-message').textContent=error.message;}});
$('close-manage').addEventListener('click',()=>{managed=null;$('manage').hidden=true;});
$('login').addEventListener('submit',async event=>{event.preventDefault();$('login-button').disabled=true;$('login-error').textContent='';
  const password=$('password').value;$('password').value='';try{await api('login',{method:'POST',body:JSON.stringify({username:$('login-user').value.trim(),password})});showDashboard(await api('me'));}catch(error){$('login-error').textContent=error.message;}finally{$('login-button').disabled=false;}});
$('logout').addEventListener('click',async()=>{try{await post('logout',{});showLogin();}catch(error){$('message').textContent=error.message;}});
for(const item of document.querySelectorAll('[data-view]'))item.addEventListener('click',()=>view(item.dataset.view));
$('server').addEventListener('change',()=>{server=$('server').value;state.offset=0;$('module-panel').hidden=true;load();});
$('moro-server').addEventListener('change',()=>{moroServer=$('moro-server').value;loadMoro();});
$('refresh').addEventListener('click',load);$('moro-refresh').addEventListener('click',loadMoro);$('search').addEventListener('input',render);$('close-modules').addEventListener('click',()=>{$('module-panel').hidden=true;});
$('previous').addEventListener('click',()=>{state.offset=Math.max(0,state.offset-50);load();});$('next').addEventListener('click',()=>{state.offset+=50;load();});
api('me').then(me=>{showDashboard(me);
  if(returned.linked||returned.sso_error){view('settings');$('settings-message').textContent=returned.linked?providerNames[returned.linked]+' is now linked. You can use it to sign in.':ssoErrors[returned.sso_error]??'Linking failed. Please try again.';}
}).catch(()=>{showLogin();if(returned.sso_error)$('login-error').textContent=ssoErrors[returned.sso_error]??'Sign-in failed. Please try again.';});
