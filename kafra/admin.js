// Keep the admin panel and HttpOnly cookie on the Worker origin, not GitHub Pages.
if(location.hostname==='dartfapper.pro'||location.hostname==='www.dartfapper.pro')location.replace('https://kafra-guard-owner.tatagpriyanugraha.workers.dev/');
const $=id=>document.getElementById(id);let state={sessions:[],offset:0,total:0},user=null,servers=[],server=null,moroServer=null,managed=null,timer;
const roles={super_admin:'Super Admin',server_owner:'Server Owner',member:'Member'};
const errors={invalid_credentials:'Wrong username or password.',too_many_attempts:'Too many attempts. Try again in 15 minutes.',admin_not_configured:'The Super Admin account is not configured on the server.',gate_not_configured:'The gate is not configured yet. No client data is shown.',gate_unavailable:'The gate cannot be reached. Check the service connection.',service_unavailable:'The admin service is not ready. Check the server configuration.',session_closed:'This client session has closed.',server_not_found:'Server not found, or this product is not enabled for it.',forbidden:'Only the Super Admin can do this.',data_key_not_configured:'KAFRA_DATA_KEY is not configured on the Worker.',invalid_name:'Server name is required (60 characters max).',invalid_gate_url:'Gate URL must be an HTTPS root, e.g. https://gate.server.com/.',invalid_gate_key:'Gate owner key must be 64 hex characters.',invalid_username:'Username must be 3–32 lowercase letters, digits, dots, underscores or dashes, and differ from the Super Admin.',weak_password:'Password must be at least 12 characters.',invalid_server:'Pick a valid server.',username_taken:'That username is taken.',invalid_plan:'Plan must be 40 characters or fewer.',invalid_expiry:'Pick a valid expiry date.',invalid_version:'Version is required (32 characters max).',invalid_build_url:'Download URL must be HTTPS.',invalid_notes:'Notes must be 1000 characters or fewer.',invalid_limits:'Clients per PC must be 1–10 and clients per network 0–100.',invalid_protection:'Protection must be on or off.',protection_unsupported:'This gate does not support the protection switch yet. Update the gate on the VPS and restart it.',invalid_reason:'Reason must be 200 characters or fewer, on one line.',invalid_device:'Invalid device ID.',not_banned:'That device is not banned.',ota_agent_offline:'The update server has not reported in the last 5 minutes.',ota_busy:'An update action is already waiting.',ota_nothing_to_promote:'Canary is not newer than production.',ota_no_rollback:'No signed rollback is ready for the live version.',invalid_action:'Unsupported action.',owner_not_found:'That owner account no longer exists.',invalid_hash:'Invalid SHA-256.',invalid_verdict:'Pick Allow or Block.',invalid_rule_text:'DLL name (128) and note (200) must be one line.',rule_not_found:'That rule no longer exists.',rule_limit:'Rule list is full (5000).',pro_required:'This is a Kafra Guard Pro feature.',pro_required_limits:'Kafra Guard allows up to 2 clients per PC and 2 per network. Upgrade to Kafra Guard Pro for more, or for no network limit.',invalid_build:'Invalid build ID.',invalid_build_label:'Label must be one line, 100 characters max.',build_limit:'Approved build list is full (200). Revoke old builds first.',build_not_approved:'That build is no longer approved.',builds_unsupported:'This gate does not support build approvals yet. Update the gate on the VPS and restart it.',invalid_kafra_plan:'Pick Kafra Guard or Kafra Guard Pro.',invalid_license_server:'License server ID: lowercase letters, digits, - or _, up to 63 characters.',invalid_max_online:'Max players online must be 0–100000.',pro_required_realms:'One license for several sub-servers is a Kafra Guard Pro feature. Kafra Guard covers one login server.',basic_max_online:'Kafra Guard allows up to 50 players online per license. Switch this server to Pro for more, or for no limit.',allow_rule_limit:'Kafra Guard allows up to 10 allowed DLLs. Remove one, or upgrade to Kafra Guard Pro for unlimited allowed DLLs.',already_has_server:'You already own a server.',gate_key_rejected:'The gate refused that owner key. Copy ownerKey from /etc/gameshield/gate.json and check the gate was restarted after adding it.',license_by_admin:'Kafra Guard Pro licenses are issued by dartfapper. Contact us for a new one.',invalid_download_kind:'Pick a tool.',invalid_download_url:'Download URL must be HTTPS.',download_limit:'The download list is full (50). Delete old versions first.',image_size:'The picture must be exactly 640 × 480 pixels.',image_too_large:'The picture must be 900 KB or smaller.',invalid_image:'That file is not a plain PNG picture (8-bit colour, no interlacing, nothing appended).',image_flagged:'This file was flagged by a malware scanner and cannot be used.',splash_not_found:'That server has no splash art.',splash_not_approved:'Only approved art can be sent to the gate.',invalid_realm:'Sub-server: lowercase letters, digits, - or _, up to 32 characters.',realms_unsupported:'This gate cannot tie builds to a sub-server yet. Update the gate on the VPS, run gate-upgrade-realms.sql and restart it.',invalid_realms:'Sub-servers: up to 16 names of lowercase letters, digits, - or _ (32 characters each), separated by commas, no duplicates.',license_key_not_configured:'KAFRA_LICENSE_KEY is not configured on the Worker.',last_sign_in:'This is your only way to sign in, so it cannot be unlinked.',invalid_core_label:'Version name (40 characters) and notes (200) must be one line.',core_limit:'The version list is full (100). Delete old versions first.',versions_unsupported:'This gate cannot report core versions yet. Update the gate on the VPS and restart it.'};
const ssoErrors={unavailable:'That sign-in option is not set up yet.',too_many_attempts:'Too many attempts. Try again in 15 minutes.',signin_first:'Sign in with your password first, then link it from Settings.',expired:'The sign-in attempt expired. Please try again.',cancelled:'Sign-in was cancelled.',provider:'Google or Discord could not confirm your account. Please try again.',already_linked:'That Google or Discord account is already linked to another user.',not_linked:'That account is no longer available. Please try again.'};
const providerNames={google:'Google',discord:'Discord'};
// OAuth callbacks come back as /#sso_error=…, /#linked=… or /#signed_in; read once, then clear the hash.
const returned=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));if(location.hash)history.replaceState(null,'',location.pathname);
async function api(path,options={}){
  const response=await fetch('/api/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});
  let data;try{data=await response.json();}catch{throw new Error('Invalid server response.');}
  if(!response.ok){if(response.status===401&&!path.startsWith('login'))showLogin();throw new Error((errors[data.error]??'Request failed. Please try again.')+(data.detail?' ('+data.detail+')':''));}return data;
}
const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data)});
const views=['dashboard','moro','admin','settings','start','empty-view'];
function showLogin(){user=null;loadProviders();for(const id of [...views,'account','side-nav','side-label'])$(id).hidden=true;$('login-section').hidden=false;$('side-role').textContent='Not signed in';$('side-note').textContent='One account for everything on dartfapper.';clearInterval(timer);}
function applyAccess(me){
  user=me;renderSettings(me);servers=me.servers;const kafra=servers.filter(s=>s.kafra),moro=servers.filter(s=>s.moro);
  $('nav-start').hidden=false;$('nav-kafra').hidden=!kafra.length;$('nav-moro').hidden=!moro.length;$('nav-admin').hidden=me.role!=='super_admin';
  fillPicker('server','server-pick',kafra,'server');fillPicker('moro-server','moro-pick',moro,'moroServer');
}
function showDashboard(me){
  $('login-section').hidden=true;$('account').hidden=false;$('side-nav').hidden=false;$('side-label').hidden=false;
  $('username').textContent=(me.name??me.username)+' / '+(roles[me.role]??me.role);$('side-role').textContent=roles[me.role]??me.role;
  $('side-note').textContent=me.role==='super_admin'?'All servers and owner accounts.':me.role==='member'?'Your dartfapper account.':'Only your server’s products.';
  applyAccess(me);
  view(me.role==='member'?'start':!$('nav-kafra').hidden?'dashboard':!$('nav-moro').hidden?'moro':me.role==='super_admin'?'admin':'start');
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
  if(name==='dashboard'){timer=setInterval(()=>{if(!document.hidden)load();},15000);load();loadLimits();}
  else if(name==='moro'){timer=setInterval(()=>{if(!document.hidden)loadMoro();},30000);loadMoro();}
  else if(name==='admin')loadAdmin();
  else if(name==='start'){$('start-message').textContent='';loadStart();}
  else if(name==='settings')api('me').then(applyAccess).catch(error=>{$('settings-message').textContent=error.message;});
}
// Get started: self-serve Kafra Guard (free) checklist, owner tools and install guide.
const downloadNames={config:'KafraGuardConfig','patcher':'KafraGuardPatcher + GameShield.dll','server-kit':'rAthena server kit',gate:'Gate (VPS)',other:'Other'};
function stepDone(id,done){$(id).classList.toggle('done',!!done);}
async function loadStart(){
  const admin=user?.role==='super_admin';$('downloads-form').hidden=!admin;
  let self={server:null};try{self=await api('self');}catch(error){$('start-message').textContent=error.message;}
  const s=self.server,member=user?.role==='member';
  $('self-server-form').hidden=!member;stepDone('step-server',!!s);
  $('step-server-status').textContent=s?'Done: '+s.name+' ('+(s.kafraPlan==='pro'?'Kafra Guard Pro':'Kafra Guard')+').':admin?'You are the Super Admin; servers are created under Servers & owners.':'Name it the way your players know it. You become its owner; sign in with the same Google or Discord account.';
  for(const id of ['self-gate-form','self-license-form'])$(id).hidden=!s;
  stepDone('step-gate',s?.gateConnected);
  $('step-gate-status').textContent=!s?'Create your server first.':s.builtIn?'Your gate is managed by dartfapper.':s.gateConnected?'Connected to '+s.gateUrl+'. Paste a new owner key here to change it.':'The dashboard reads players and builds from your gate with the owner key. It is checked before it is saved, and stored encrypted.';
  if(s?.builtIn)$('self-gate-form').hidden=true;if(s?.gateUrl&&!$('self-gate-url').value)$('self-gate-url').value=s.gateUrl;
  if(s&&!$('self-license-server').value)$('self-license-server').value=s.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,63)||'my-ro';
  const licenses=self.licenses??[],latest=licenses[0],valid=latest&&Date.parse(latest.expiresAt+'T23:59:59Z')>Date.now();stepDone('step-license',valid);
  if(s?.kafraPlan==='pro'){$('self-license-form').hidden=true;$('step-license-status').textContent='Kafra Guard Pro licenses come from dartfapper with your plan.';}
  else if(s)$('step-license-status').textContent=valid?'Current license expires '+latest.expiresAt+'. Generate a new one any time before then and paste it over the old one.':'Free licenses last 30 days, for one login server and up to 50 players online.';
  const tbody=$('self-licenses');if(!licenses.length)empty(tbody,'No license yet.',5);else{tbody.replaceChildren();
    for(const l of licenses){const tr=document.createElement('tr');cell(tr,l.server,true);cell(tr,l.expiresAt);cell(tr,String(l.maxOnline||'No limit'));cell(tr,date(l.issuedAt));
      const td=document.createElement('td'),copy=document.createElement('button');copy.type='button';copy.className='quiet';copy.textContent='Copy';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(l.license);copy.textContent='Copied ✓';}catch{copy.textContent='Copy failed';}});td.append(copy);tr.append(td);tbody.append(tr);}}
  await loadDownloads();
}
async function loadDownloads(){
  const tbody=$('downloads'),admin=user?.role==='super_admin';
  try{const {downloads}=await api('downloads');if(!downloads.length){empty(tbody,'Downloads are being prepared. Ask dartfapper for the owner tools in the meantime.',4);return;}tbody.replaceChildren();
    for(const d of downloads){const tr=document.createElement('tr'),name=cell(tr,downloadNames[d.kind]??d.kind);if(d.notes){const small=document.createElement('small');small.className='hint';small.textContent=' '+d.notes;name.append(small);}
      cell(tr,d.version,true);const hash=cell(tr,d.sha256.slice(0,16)+'…',true);hash.title=d.sha256;
      const td=link(tr,d.url,'Download →');
      if(admin){const remove=document.createElement('button');remove.type='button';remove.className='quiet danger';remove.textContent='Delete';
        remove.addEventListener('click',()=>{if(confirm('Remove '+(downloadNames[d.kind]??d.kind)+' '+d.version+' from the list?'))post('admin/downloads/delete',{id:d.id}).then(loadDownloads,error=>{$('start-message').textContent=error.message;});});td.append(' ',remove);}
      tbody.append(tr);}
  }catch(error){empty(tbody,error.message,4);}
}
function startForm(id,send,done){$(id).addEventListener('submit',async event=>{event.preventDefault();const button=$(id).querySelector('button.primary');button.disabled=true;
  try{const result=await send();$('start-message').textContent=done(result)??'';}catch(error){$('start-message').textContent=error.message;}finally{button.disabled=false;}});}
startForm('self-server-form',async()=>{await post('self/server',{name:$('self-server-name').value.trim()});showDashboard(await api('me'));view('start');},()=>'Your server is ready. Next: download the owner tools.');
startForm('self-gate-form',()=>post('self/gate',{gateUrl:$('self-gate-url').value.trim(),gateKey:$('self-gate-key').value.trim()}),()=>{$('self-gate-key').value='';loadStart();api('me').then(applyAccess);return 'Gate connected. Players and client builds now show under Kafra Guard.';});
startForm('self-license-form',()=>post('self/license',{server:$('self-license-server').value.trim()}),result=>{$('self-license-output').hidden=false;$('self-license-value').textContent=result.license;$('copy-self-license').textContent='Copy license';loadStart();return 'License generated, valid until '+result.expiresAt+'.';});
$('copy-self-license').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('self-license-value').textContent.trim());$('copy-self-license').textContent='Copied ✓';}catch{$('copy-self-license').textContent='Select the code and press Ctrl+C';}});
$('download-file').addEventListener('change',async()=>{const file=$('download-file').files[0];if(!file)return;$('download-sha').value='Hashing…';
  try{$('download-sha').value=await sha256Hex(file);}catch{$('download-sha').value='';$('start-message').textContent='Could not read that file.';}});
startForm('downloads-form',()=>post('admin/downloads',{kind:$('download-kind').value,version:$('download-version').value.trim(),url:$('download-url').value.trim(),sha256:$('download-sha').value.trim().toLowerCase(),notes:$('download-notes').value.trim()}),()=>{$('downloads-form').reset();loadDownloads();return 'Download added.';});
// Pro splash art: owner upload (reviewed by the Super Admin before it reaches players).
const splashStates={pending:['Waiting for review','review'],approved:['Approved',''],rejected:['Not approved','alert']};
async function loadSplash(){
  const panel=$('splash-panel');if(!server||planOf()!=='pro'){panel.hidden=true;return;}
  try{const {splash}=await api('splash?server='+encodeURIComponent(server));panel.hidden=false;const state=$('splash-state');
    $('splash-preview').hidden=!splash;if(splash)$('splash-preview').src=splash.image;
    state.hidden=!splash;if(splash){const [label,kind]=splashStates[splash.status]??[splash.status,''];state.textContent=label;state.className='badge'+(kind?' '+kind:'');}
    $('splash-publish').hidden=splash?.status!=='approved';$('splash-delete').hidden=!splash;
    $('splash-note').textContent=!splash?'Your own picture on the game\'s start screen, with a small "Powered by Kafra Guard" badge. PNG, exactly 640 × 480, up to 900 KB.':
      splash.status==='pending'?'Uploaded '+date(splash.uploadedAt)+'. dartfapper reviews it before players see it.':
      splash.status==='rejected'?'Not approved'+(splash.note?': '+splash.note:'.')+' Upload a new picture.':
      splash.publishedAt?'Live on your gate since '+date(splash.publishedAt)+'. Players get it on their next game start.':'Approved, but your gate has not accepted it yet. Check the gate is updated (gate-upgrade-splash.sql), then send it again.';}
  catch{panel.hidden=true;}
}
$('splash-form').addEventListener('submit',async event=>{event.preventDefault();const file=$('splash-file').files[0],button=$('splash-form').querySelector('button.primary');if(!file)return;
  $('splash-status').textContent='';button.disabled=true;
  try{if(file.size>900*1024)throw new Error(errors.image_too_large);
    // Size check before upload; the Worker checks the file again.
    const bitmap=await createImageBitmap(file).catch(()=>null);if(!bitmap)throw new Error(errors.invalid_image);
    const size=[bitmap.width,bitmap.height];bitmap.close?.();if(size[0]!==640||size[1]!==480)throw new Error(errors.image_size+' This one is '+size.join(' × ')+'.');
    const bytes=new Uint8Array(await file.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
    await post('splash',{server,image:btoa(text)});$('splash-form').reset();$('splash-status').textContent='Uploaded. It shows to players once dartfapper approves it.';}
  catch(error){$('splash-status').textContent=error.message;}finally{button.disabled=false;}
  await loadSplash();});
$('splash-publish').addEventListener('click',async()=>{try{const {published}=await post('splash/publish',{server});$('splash-status').textContent=published?'Sent to your gate.':'Your gate did not accept it. Update the gate and run gate-upgrade-splash.sql, then try again.';}catch(error){$('splash-status').textContent=error.message;}await loadSplash();});
$('splash-delete').addEventListener('click',async()=>{if(!confirm('Remove your splash art? Players go back to the Kafra Guard pictures on their next start.'))return;
  try{await post('splash/delete',{server});$('splash-status').textContent='Splash art removed.';}catch(error){$('splash-status').textContent=error.message;}await loadSplash();});
// Super Admin review queue.
async function loadSplashReview(){
  const box=$('splash-review');
  try{const {splash}=await api('admin/splash');box.replaceChildren();
    if(!splash.length){const p=document.createElement('p');p.className='hint';p.textContent='No splash art uploaded yet.';box.append(p);return;}
    for(const s of splash){const card=document.createElement('article');card.className='splash-card';
      const img=document.createElement('img');img.src=s.image;img.alt='Splash art of '+s.name;img.width=320;img.height=240;
      const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');title.textContent=s.name;
      const [label]=splashStates[s.status]??[s.status];meta.textContent=label+' · uploaded '+date(s.uploadedAt)+' by '+s.uploadedBy+' · malware check: '+({skipped:'not configured',unknown:'not seen before',clean:'clean',error:'unavailable'}[s.scan]??s.scan)+(s.note?' · '+s.note:'')+(s.status==='approved'?(s.publishedAt?' · on gate':' · not on gate yet'):'');
      const actions=document.createElement('div');actions.className='splash-actions';
      const approve=document.createElement('button');approve.type='button';approve.className='primary';approve.textContent='Approve';
      approve.addEventListener('click',()=>confirmed('Approve this art for '+s.name+'? It will be signed and sent to that server\'s gate.',()=>post('admin/splash/review',{server:s.server,approve:true})));
      const reject=document.createElement('button');reject.type='button';reject.className='quiet danger';reject.textContent='Reject';
      reject.addEventListener('click',()=>{const note=prompt('Reason shown to the owner (optional):','');if(note===null)return;post('admin/splash/review',{server:s.server,approve:false,note:note.slice(0,200)}).then(loadSplashReview,error=>{$('admin-message').textContent=error.message;});});
      if(s.status!=='approved')actions.append(approve);if(s.status!=='rejected')actions.append(reject);
      info.append(title,meta,actions);card.append(img,info);box.append(card);}}
  catch(error){box.textContent=error.message;}
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
  const rows=state.sessions.filter(s=>[s.deviceId,s.ip,s.account?.userid,s.account?.character?.name].join(' ').toLowerCase().includes(query));
  if(!rows.length)empty(tbody,query?'No matches on this page.':'No verified clients are active.',7);
  for(const session of rows){const row=document.createElement('tr');const device=cell(row,session.deviceId.slice(0,16)+'…',true);device.title=session.deviceId;
    // Account linked by the login server (matched on the client's network); character only while one is online.
    const account=session.account,player=cell(row,account?account.userid+(account.character?' · '+account.character.name+' (Lv '+account.character.level+')':' · at character select'):'Not logged in');
    if(account)player.title='Account ID '+account.accountId+(account.character?', character '+account.character.name:'');
    cell(row,session.ip);const build=cell(row,session.buildHash.slice(0,12)+'…',true);build.title=session.buildHash;
    const count=cell(row,session.moduleCount===null?'Awaiting report':session.moduleCount+' modules'+(session.unknownModules?' · '+session.unknownModules+' unknown':''));
    // Known third-party tools (Cheat Engine, XKore, WPE…) flagged by the gate from the module report.
    if(session.flags?.length){row.className='flagged';const badge=document.createElement('span');badge.className='badge alert';
      badge.textContent='⚠ '+[...new Set(session.flags.map(f=>f.tool))].join(', ');badge.title=session.flags.map(f=>f.name).join(', ');count.append(badge);}
    cell(row,time(session.lastSeen));
    const action=document.createElement('td'),button=document.createElement('button');button.className='quiet';button.textContent=planOf()==='pro'?'View modules →':'🔒 View modules';button.addEventListener('click',()=>modules(session));
    const kick=document.createElement('button');kick.className='quiet danger';kick.textContent='Kick';kick.title='End this session; the game closes on its next heartbeat';
    kick.addEventListener('click',()=>guardAction('Kick this client ('+session.ip+')? The game closes within about 30 seconds.',()=>post('kick',{server,id:session.id}),'Client kicked.'));
    const ban=document.createElement('button');ban.className='quiet danger';ban.textContent='Ban';ban.title='Block this PC (hardware ID) from starting the game';
    ban.addEventListener('click',()=>{const reason=prompt('Ban this PC from starting the game?\nDevice '+session.deviceId.slice(0,16)+'… ('+session.ip+')\n\nReason (optional, shown only here):','');
      if(reason!==null)guardAction(null,()=>post('ban',{server,deviceId:session.deviceId,reason}),'PC banned. Its open game closes within about 30 seconds.');});
    action.className='row-actions';action.append(button,kick,ban);row.append(action);tbody.append(row);}
  $('page-info').textContent=state.total?'Showing '+(state.offset+1)+'–'+Math.min(state.offset+state.sessions.length,state.total)+' of '+state.total+' sessions':'0 active sessions';
  $('previous').disabled=state.offset===0;$('next').disabled=state.offset+50>=state.total;
}
// Alert on clients with known cheat modules: message bar, tab title, and a desktop notification once per session.
const notified=new Set();
function alertFlags(sessions){
  const flagged=sessions.filter(s=>s.flags?.length);
  document.title=(flagged.length?'(⚠ '+flagged.length+') ':'')+document.title.replace(/^\(⚠ \d+\) /,'');
  if(!flagged.length)return;
  const tools=[...new Set(flagged.flatMap(s=>s.flags.map(f=>f.tool)))].join(', ');
  $('message').textContent='⚠ '+flagged.length+(flagged.length===1?' client has':' clients have')+' a known cheat tool loaded ('+tools+'). Check the red rows, then Kick or Ban.';
  if(!('Notification' in window))return;
  if(Notification.permission==='default'){Notification.requestPermission().catch(()=>{});return;}
  if(Notification.permission!=='granted')return;
  for(const s of flagged)if(!notified.has(s.id)){notified.add(s.id);
    new Notification('Kafra Guard: cheat tool detected',{body:(s.account?.character?.name??s.account?.userid??s.ip)+' · '+[...new Set(s.flags.map(f=>f.tool))].join(', '),tag:'kafra-'+s.id});}
}
async function load(){
  if(!server){$('message').textContent='No server has Kafra Guard enabled.';empty($('sessions'),'No server.',7);return;}
  $('refresh').disabled=true;
  try{const data=await api('sessions?server='+encodeURIComponent(server)+'&offset='+state.offset);state={...state,...data};$('total').textContent=data.total;$('reported').textContent=data.sessions.filter(s=>s.moduleCount!==null).length;$('updated').textContent=time(data.updatedAt);$('message').textContent='';render();alertFlags(data.sessions);}
  catch(error){state={sessions:[],offset:state.offset,total:0};$('message').textContent=error.message;$('total').textContent='—';$('reported').textContent='—';$('updated').textContent='—';empty($('sessions'),'Data unavailable. The panel never shows sample data.',7);}
  finally{$('refresh').disabled=false;}
  loadBans();loadRules();loadBuilds();loadCore();
}
// GameShield.dll per online player, named from the Super Admin's version list.
async function loadCore(){
  if(!server)return;const tbody=$('core-usage');
  try{const data=await api('versions?server='+encodeURIComponent(server));$('core-usage-panel').hidden=false;tbody.replaceChildren();
    const outdated=data.versions.filter(v=>v.status==='outdated'||v.status==='unlisted').reduce((n,v)=>n+v.players,0),current=data.versions.find(v=>v.status==='latest')?.players??0;
    $('core-outdated').hidden=!outdated;$('core-outdated').textContent=outdated+' on an old version';
    $('core-summary').textContent=!data.players?'No players online right now.':!data.latest?'No latest version is set yet'+(user.role==='super_admin'?'. Mark one under Servers & owners.':'.')
      :current+' of '+data.players+' online '+(data.players===1?'player runs':'players run')+' the latest core, '+data.latest.label+'.'+(outdated?' Players on an old version should download the new patch.':'');
    const states={latest:['Latest',''],outdated:['Old version',' review'],unlisted:['Not in the version list',' review'],unreported:['Waiting for first report',' wait']};
    for(const v of data.versions){const tr=document.createElement('tr');cell(tr,v.label??(v.sha256?'Unknown':'—'));const s=cell(tr,'');const b=document.createElement('span');const [text,tone]=states[v.status]??states.unlisted;
      b.className='badge'+tone;b.textContent=text;s.replaceChildren(b);cell(tr,String(v.players));const h=cell(tr,v.sha256?v.sha256.slice(0,16)+'…':'—',!!v.sha256);if(v.sha256)h.title=v.sha256;tbody.append(tr);}
    if(!tbody.childElementCount)empty(tbody,'No players online right now.',4);}
  catch(error){$('core-usage-panel').hidden=false;$('core-outdated').hidden=true;empty(tbody,error.message,4);}
}
// Client builds: published by the release profile, approved here, or refused at start and waiting for approval.
async function loadBuilds(){
  if(!server)return;const tbody=$('builds');
  try{const data=await api('builds?server='+encodeURIComponent(server));$('builds-panel').hidden=false;tbody.replaceChildren();
    $('builds-waiting').hidden=!data.pending.length;$('builds-waiting').textContent=data.pending.length+' waiting';
    const row=(build,status,tone,label,when,button)=>{const tr=document.createElement('tr');const id=cell(tr,build.slice(0,16)+'…',true);id.title=build;
      const s=cell(tr,'');const b=document.createElement('span');b.className='badge'+tone;b.textContent=status;s.replaceChildren(b);
      cell(tr,label||'—');cell(tr,when);const td=document.createElement('td');td.className='row-actions';if(button)td.append(button);tr.append(td);tbody.append(tr);if(tone===' review')tr.className='waiting';};
    const action=(text,cls,handler)=>{const b=document.createElement('button');b.type='button';b.className='quiet'+cls;b.textContent=text;b.addEventListener('click',handler);return b;};
    for(const p of data.pending)row(p.build,'Waiting for approval',' review','',p.attempts+(p.attempts===1?' start':' starts')+' refused · last '+date(p.lastSeen),
      action('Approve','',async()=>{const label=prompt('Approve this build so players can start it.\nBuild '+p.build.slice(0,16)+'…\n\nLabel (optional, e.g. "Patch 31 Oct"):','');if(label===null)return;
        const realm=planOf()==='pro'?prompt('Which sub-server is this client for? (e.g. renewal, classic, revo)\n\nIt can then only log into that sub-server. Leave empty if this gate serves one server.',''):'';if(realm===null)return;
        await buildAction(()=>post('build',{server,build:p.build,label,realm}),'Build approved. Players can start it now.');}));
    for(const a of data.approved)row(a.build,'Approved','',(a.label||'—')+(a.realm?' · '+a.realm:''),'Approved '+date(a.approvedAt),
      action('Revoke',' danger',()=>{if(confirm('Revoke this build? Players using it can no longer start the game.'))buildAction(()=>post('unbuild',{server,build:a.build}),'Approval revoked.');}));
    for(const b of data.published??[])row(b,'Published release','','Signed release profile','—',null);
    if(!tbody.childElementCount)empty(tbody,data.published===null?'This gate runs in lab mode: every build is accepted.':'No builds yet.',5);}
  catch(error){$('builds-panel').hidden=false;empty(tbody,error.message,5);}
}
async function buildAction(send,done){try{await send();$('builds-status').textContent=done;}catch(error){$('builds-status').textContent=error.message;}await loadBuilds();}
async function guardAction(question,send,done){
  if(question&&!confirm(question))return;
  try{await send();$('message').textContent=done;}catch(error){$('message').textContent=error.message;}
  await load();
}
async function sha256Hex(file){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function loadRules(){
  if(!server)return;const tbody=$('rules');
  try{const {rules}=await api('rules?server='+encodeURIComponent(server));$('rules-panel').hidden=false;tbody.replaceChildren();
    const cap=servers.find(s=>s.id===server)?.limits?.allowRules??5000;
    $('rules-count').textContent=rules.filter(r=>r.verdict==='allow').length+(cap<5000?' / '+cap+' allowed (Kafra Guard; Pro has no limit)':' allowed')+' · '+rules.filter(r=>r.verdict==='block').length+' blocked';
    if(!rules.length)empty(tbody,'No rules yet. Add DLLs here, or use Allow / Block in a client\'s module list.',5);
    for(const rule of rules.sort((a,b)=>a.verdict.localeCompare(b.verdict)||a.name.localeCompare(b.name))){const row=document.createElement('tr');
      cell(row,rule.name||'—',true);const hash=cell(row,rule.sha256.slice(0,16)+'…',true);hash.title=rule.sha256;
      const verdict=cell(row,'');const badge=document.createElement('span');badge.className='badge'+(rule.verdict==='block'?' alert':'');badge.textContent=rule.verdict==='block'?'Block':'Allow';verdict.replaceChildren(badge);
      cell(row,rule.note||'—');const action=document.createElement('td'),remove=document.createElement('button');remove.className='quiet';remove.textContent='Remove';
      remove.addEventListener('click',()=>guardAction('Remove the rule for '+(rule.name||rule.sha256.slice(0,16))+'?',()=>post('unrule',{server,sha256:rule.sha256}),'Rule removed.').then(loadRules));
      action.append(remove);row.append(action);tbody.append(row);}}
  catch{$('rules-panel').hidden=true;}
}
$('rules-form').addEventListener('submit',async event=>{event.preventDefault();const files=[...$('rule-files').files];if(!files.length){$('rules-status').textContent='Pick one or more DLL files.';return;}
  const verdict=$('rule-verdict').value,note=$('rule-note').value.trim();let done=0;
  try{for(const file of files){if(file.size>256*1024*1024)throw new Error(file.name+' is larger than 256 MB.');$('rules-status').textContent='Hashing '+file.name+'…';
      await post('rule',{server,sha256:await sha256Hex(file),name:file.name.slice(0,128),verdict,note});done++;}
    $('rules-status').textContent=done+' rule'+(done===1?'':'s')+' saved.';$('rules-form').reset();}
  catch(error){$('rules-status').textContent=(done?done+' saved, then: ':'')+error.message;}
  await loadRules();await load();});
$('allow-unknown').addEventListener('click',async()=>{if(!unknownReport.length||!confirm('Allow all '+unknownReport.length+' unknown DLLs in this report by hash? Do this only on a clean PC.'))return;
  let done=0;try{for(const module of unknownReport){await post('rule',{server,sha256:module.sha256,name:String(module.name).slice(0,128),verdict:'allow',note:'Baseline from a clean client'});done++;}}
  catch(error){$('module-status').textContent=done+' allowed, then: '+error.message;}
  await loadRules();if(reportSession)await modules(reportSession);await load();});
async function loadBans(){
  if(!server)return;const tbody=$('bans');
  try{const {bans}=await api('bans?server='+encodeURIComponent(server));tbody.replaceChildren();$('bans-panel').hidden=false;
    $('bans-count').textContent=bans.length?bans.length+' banned':'';
    if(!bans.length)empty(tbody,'No banned devices.',4);
    for(const ban of bans){const row=document.createElement('tr');const device=cell(row,ban.deviceId.slice(0,16)+'…',true);device.title=ban.deviceId;
      cell(row,ban.reason||'—');cell(row,ban.bannedAt?date(ban.bannedAt):'Config file');
      const action=document.createElement('td'),unban=document.createElement('button');unban.className='quiet';unban.textContent='Unban';
      unban.addEventListener('click',()=>guardAction('Unban this PC? It can start the game again.',()=>post('unban',{server,deviceId:ban.deviceId}),'PC unbanned.'));
      action.append(unban);row.append(action);tbody.append(row);}}
  catch{$('bans-panel').hidden=true;}
}
// Kafra Guard plans. Basic servers see an upgrade card where a Pro feature would be; the Worker refuses the call too.
const planOf=()=>servers.find(s=>s.id===server)?.kafraPlan==='pro'?'pro':'basic';
const upsellCopy={
  protection:{title:'Test mode',text:'Pause protection while you test a new patch, then switch it back on in one click. On your current plan every game start is always protected.'},
  splash:{title:'Your own splash art',text:'Show your server’s artwork on the game start screen instead of the Kafra Guard pictures, with a small “Powered by Kafra Guard” badge.'},
  modules:{title:'Player module reports',text:'See every DLL loaded inside a player’s game, spot unknown tools, and allow or block them by hash.'}};
function upsell(kind){
  const card=document.createElement('div');card.className='upsell-body';const copy=upsellCopy[kind],admin=user?.role==='super_admin';
  const tag=document.createElement('span');tag.className='pro-tag';tag.textContent='🔒 KAFRA GUARD PRO';
  const title=document.createElement('h2');title.textContent=copy.title;const text=document.createElement('p');text.className='hint';text.textContent=copy.text;
  const copyBox=document.createElement('div');copyBox.append(tag,title,text);
  const action=document.createElement(admin?'button':'a');action.className='primary upsell-cta';
  if(admin){action.type='button';action.innerHTML='Switch this server to Pro <span>→</span>';action.addEventListener('click',()=>{view('admin');});}
  else{action.href='https://dartfapper.pro/contact/';action.target='_blank';action.rel='noopener';action.innerHTML='Upgrade to Pro <span>→</span>';}
  const note=document.createElement('small');note.className='upsell-note';note.textContent=admin?'Servers & owners → Manage → Plan.':'Your server switches over instantly. No reinstall, no client update.';
  const side=document.createElement('div');side.className='upsell-action';side.append(action,note);card.append(copyBox,side);return card;
}
function renderPlan(){
  const pro=planOf()==='pro',badge=$('plan-badge');badge.hidden=!server;badge.textContent=pro?'PRO':'BASIC';badge.classList.toggle('pro',pro);
  for(const panel of document.querySelectorAll('[data-upsell]')){panel.hidden=pro||!server;if(!pro&&!panel.childElementCount)panel.append(upsell(panel.dataset.upsell));}
  if(!pro)$('protection-panel').hidden=true;
  // Client limits are on every plan; Basic stops at 2 per PC and 2 per network (no "no limit"), shown on the form.
  const cap=servers.find(s=>s.id===server)?.limits??{maxPerDevice:10,maxPerNetwork:100};
  $('limit-device').max=cap.maxPerDevice;$('limit-network').max=cap.maxPerNetwork;$('limit-network').min=pro?0:1;
  $('limit-device-hint').textContent=pro?'How many game windows one computer may run (1–10). 1 blocks multi-client.':'How many game windows one computer may run (1 or 2). 1 blocks multi-client.';
  $('limit-network-hint').textContent=pro?'Total clients from one internet connection (same /24 network). 0 = no limit; raise it for internet cafés.':'Total clients from one internet connection (same /24 network), 1 or 2.';
  $('limits-pro').hidden=pro;
}
let protection=true;
function showProtection(on){protection=on;$('protection-panel').hidden=false;
  $('protection-state').textContent=on?'On':'Off';$('protection-state').className='badge'+(on?'':' alert');
  $('protection-note').textContent=on?'Every game start must pass the Kafra Guard gate. Disable it to test the game without the shield; the splash still shows.':
    'Test mode: the game starts after the splash without the gate, heartbeats or module reports, and the gate allows every login. Turn it back on when testing is done.';
  $('protection-toggle').checked=on;}
async function loadLimits(){
  if(!server)return;$('limits-status').textContent='';renderPlan();loadSplash();
  try{const policy=await api('policy?server='+encodeURIComponent(server));$('limit-device').value=policy.maxPerDevice;$('limit-network').value=policy.maxPerNetwork;$('limits-form').hidden=false;
    if(planOf()==='pro')showProtection(policy.protection!==false);}
  catch(error){$('limits-form').hidden=true;$('protection-panel').hidden=true;}
}
$('protection-toggle').addEventListener('change',async()=>{const next=$('protection-toggle').checked;$('protection-status').textContent='';
  if(!next&&!confirm('Disable Kafra Guard protection?\n\nNew game starts skip the gate (the splash still shows) and the gate allows every login, so cheats are not stopped. Clients already running keep their current mode until restarted.')){showProtection(true);return;}
  const toggle=$('protection-toggle');toggle.disabled=true;$('protection-status').textContent='Saving…';
  try{const policy=await post('policy',{server,protection:next});showProtection(policy.protection!==false);$('protection-status').textContent=(policy.protection===false?'Protection disabled':'Protection enabled')+' · applies to new game starts.';}
  catch(error){showProtection(protection);$('protection-status').textContent=error.message;}finally{toggle.disabled=false;}});
$('limits-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('limits-form').querySelector('button.primary');button.disabled=true;
  try{const policy=await post('policy',{server,maxPerDevice:Number($('limit-device').value),maxPerNetwork:Number($('limit-network').value)});
    $('limit-device').value=policy.maxPerDevice;$('limit-network').value=policy.maxPerNetwork;$('limits-status').textContent='Saved · applies to new game starts';}
  catch(error){$('limits-status').textContent=error.message;}finally{button.disabled=false;}});
let unknownReport=[],reportSession=null;
async function modules(session){reportSession=session;
  const pro=planOf()==='pro',panel=$('module-panel');panel.querySelector('.upsell-body')?.remove();
  for(const part of panel.querySelectorAll('.table-wrap,.module-note'))part.hidden=!pro;$('allow-unknown').hidden=true;
  if(!pro){panel.hidden=false;$('module-title').textContent='Client modules · '+session.ip;panel.querySelector('.panel-top').after(upsell('modules'));panel.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
  $('module-panel').hidden=false;$('module-title').textContent='Client modules · '+session.ip;empty($('modules'),'Loading client report…',4);$('module-status').textContent='';
  try{const data=await api('modules?server='+encodeURIComponent(server)+'&id='+encodeURIComponent(session.id));
    $('module-status').textContent=data.receivedAt?'Received '+time(data.receivedAt)+(data.truncated?' · List capped at 128 modules.':''):'The client has not sent a module report yet.';
    if(!data.modules.length){empty($('modules'),'No module report for this session yet.',4);return;}
    const order={blocked:0,unknown:1,allowed:2,signed:3};unknownReport=data.modules.filter(m=>m.trust==='unknown'&&m.sha256);$('allow-unknown').hidden=!unknownReport.length;
    $('allow-unknown').textContent='Allow all unknown ('+unknownReport.length+')';
    $('modules').replaceChildren();for(const module of [...data.modules].sort((a,b)=>(order[a.trust]??1)-(order[b.trust]??1))){const row=document.createElement('tr');cell(row,module.name,true);const status=cell(row,'');
      const badge=document.createElement('span');badge.className='badge'+(module.trust==='allowed'||module.trust==='signed'?'':' review');
      badge.textContent=({allowed:'Allowed (hash)',signed:'Verified signature',unknown:({unsigned:'Unsigned',untrusted:'Untrusted',read_error:'Unreadable'})[module.signature]??'Unknown'})[module.trust]??'Not checked';status.replaceChildren(badge);
      if(module.flag){row.className='flagged';badge.className='badge alert';badge.textContent='⚠ '+module.flag;}cell(row,module.sha256??'Hash unavailable',true).className='module-hash';
      const actions=document.createElement('td');actions.className='row-actions';
      if(module.sha256)for(const [verdict,label] of [['allow','Allow'],['block','Block']])if(!(verdict==='allow'&&module.trust==='allowed')){
        const button=document.createElement('button');button.className='quiet'+(verdict==='block'?' danger':'');button.textContent=label;
        button.addEventListener('click',async()=>{const note=verdict==='block'?prompt('Block '+module.name+' by hash.\nLabel shown on the alert (optional):',''):'';if(note===null)return;
          try{await post('rule',{server,sha256:module.sha256,name:module.name,verdict,note});await loadRules();await modules(session);await load();}catch(error){$('module-status').textContent=error.message;}});
        actions.append(button);}
      row.append(actions);$('modules').append(row);}
  }catch(error){empty($('modules'),error.message,4);}
  $('module-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
// OTA per server: what each channel serves (reported by the agent on the update host) and promote canary -> production.
function renderOta(ota){
  $('ota-panel').hidden=user?.role!=='super_admin';if(user?.role!=='super_admin')return;
  const label=c=>c?.version?(c.tag||'untagged')+(c.dirty?' (dirty)':''):'Nothing published';
  const meta=c=>c?.version?['version '+c.version,c.builtAt?'built '+date(Date.parse(c.builtAt)):null,c.commit?'commit '+c.commit.slice(0,7):null].filter(Boolean).join(' \u00b7 '):'';
  $('ota-prod').textContent=label(ota?.production);$('ota-prod-meta').textContent=meta(ota?.production);
  $('ota-canary').textContent=label(ota?.canary);$('ota-canary-meta').textContent=meta(ota?.canary);
  $('ota-back').textContent=ota?.rollback?.version?label(ota.rollback):'None ready';$('ota-back-meta').textContent=meta(ota?.rollback);
  const newer=ota?.canary?.version&&(!ota.production?.version||ota.canary.version>ota.production.version);
  $('ota-status').textContent=!ota?.reportedAt?'The update server is not connected yet (moro-ota-agent.py).':
    ota.pending?(ota.pending.action==='rollback'?'Rollback':'Update')+' requested '+time(ota.pending.at)+', waiting for the update server (up to 1 minute)\u2026':
    (ota.connected?'Update server connected \u00b7 last report '+time(ota.reportedAt):'Update server offline since '+time(ota.reportedAt))+
    (ota.lastResult?' \u00b7 last action '+(ota.lastResult.ok?'done':'failed')+(ota.lastResult.message?': '+ota.lastResult.message:''):'');
  const admin=user?.role==='super_admin',busy=!ota?.connected||!!ota?.pending;
  $('ota-promote').hidden=!admin||!newer;$('ota-promote').disabled=busy;
  $('ota-rollback').hidden=!admin||!ota?.rollback?.version;$('ota-rollback').disabled=busy;
  $('ota-rollback').textContent='Rollback to '+label(ota?.rollback);
}
async function otaAction(action,question){if(!confirm(question))return;
  try{await post('admin/moro/ota',{serverId:moroServer,action});}catch(error){$('moro-message').textContent=error.message;}await loadMoro();}
$('ota-promote').addEventListener('click',()=>otaAction('promote','Send the canary code to every phone on production?'));
$('ota-rollback').addEventListener('click',()=>otaAction('rollback','Put every phone on production back to the previous code?'));
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
    // Game server report (account, character, IP) first; app-only pings (launcher / login screen) after it.
    renderOta(data.ota);
    const players=$('moro-players'),apps=data.players??[],inGame=data.inGame??[];players.replaceChildren();
    if(!inGame.length&&!apps.length)empty(players,'No mobile player is online right now.',5);
    for(const p of inGame){const row=document.createElement('tr');const app=apps.find(a=>a.accountId===p.accountId);
      cell(row,p.name+(p.level?' (Lv '+p.level+')':''));const account=cell(row,p.userid||String(p.accountId));account.title='Account ID '+p.accountId;
      cell(row,p.ip||'—',true);cell(row,app?[app.device,app.os].filter(Boolean).join(' · '):'MoRo app');cell(row,time(p.reportedAt));players.append(row);}
    for(const p of apps.filter(a=>!inGame.some(g=>g.accountId===a.accountId&&a.accountId))){const row=document.createElement('tr');
      cell(row,p.name||'Not in game (launcher / login)');cell(row,p.accountId?String(p.accountId):'—');cell(row,'—');
      cell(row,[p.device,p.os].filter(Boolean).join(' · ')||'—');cell(row,time(p.lastSeen));players.append(row);}
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
  loadCoreCatalog();loadSplashReview();
  try{const data=await api('admin/servers');$('admin-message').textContent='';
    $('owner-server').replaceChildren(...data.servers.map(s=>new Option(s.name,s.id)));$('owner-form').querySelector('button').disabled=!data.servers.length;
    const tbody=$('server-list');if(!data.servers.length){empty(tbody,'No servers yet. Add the first one above.',4);}else tbody.replaceChildren();
    for(const s of data.servers){const row=document.createElement('tr');cell(row,s.name);
      const products=document.createElement('td');products.className='owner-cell';products.append(badge(s.kafra&&s.kafraPlan==='pro'?'Kafra Guard Pro':'Kafra Guard',s.kafra),' ',badge('Mobile RO',s.moro));row.append(products);
      const owners=document.createElement('td');owners.className='owner-cell';
      if(!s.owners.length){const none=document.createElement('span');none.className='muted';none.textContent='No owners yet';owners.append(none);}
      for(const o of s.owners){const chip=document.createElement('span');chip.className='chip';chip.textContent=o.username;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove owner '+o.username;remove.setAttribute('aria-label','Remove owner '+o.username);
        remove.addEventListener('click',()=>confirmed('Remove owner account "'+o.username+'"? Its login sessions are revoked too.',()=>post('admin/owners/delete',{username:o.username})));const reset=document.createElement('button');reset.type='button';reset.textContent='Reset password';reset.className='chip-action';reset.title='Set a new password for '+o.username;
        reset.addEventListener('click',()=>{const password=prompt('New password for "'+o.username+'" (at least 12 characters). Their open sessions are signed out.');if(password===null)return;
          confirmed('Set the new password for "'+o.username+'"?',async()=>{await post('admin/owners/password',{username:o.username,password});alert('Password changed for '+o.username+'.');});});
        chip.append(reset,remove);owners.append(chip);}
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
  if(managed?.id!==s.id){$('license-output').hidden=true;$('license-form').reset();$('license-server').value=s.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,63);}
  managed=s;$('manage').hidden=false;$('manage-title').textContent=s.name;
  $('kafra-enabled').checked=s.kafra;$('kafra-plan').value=s.kafraPlan==='pro'?'pro':'basic';$('license-form').hidden=!s.kafra;if(s.kafra)loadLicenses();licenseLimits(s);$('kafra-gate').value=s.gateUrl??'';$('kafra-key').value='';$('kafra-key-hint').textContent=s.gateUrl?'Leave empty to keep the stored key.':'Required the first time Kafra Guard is enabled.';
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
// Super Admin list of known GameShield.dll versions (SHA-256 only).
async function loadCoreCatalog(){
  const tbody=$('core-list');
  try{const {versions}=await api('admin/core');if(!versions.length){empty(tbody,'No versions yet. Choose the GameShield.dll you ship to add the first one.',5);return;}tbody.replaceChildren();
    for(const v of versions){const tr=document.createElement('tr');const name=cell(tr,v.label);if(v.latest){const tag=document.createElement('span');tag.className='badge';tag.textContent='Latest';name.append(' ',tag);}
      cell(tr,v.sha256.slice(0,16)+'…',true).title=v.sha256;cell(tr,v.notes||'—').className='notes';cell(tr,date(v.addedAt));
      const td=document.createElement('td');td.className='row-actions';
      if(!v.latest){const mark=document.createElement('button');mark.type='button';mark.className='quiet';mark.textContent='Mark latest';
        mark.addEventListener('click',()=>confirmed('Make "'+v.label+'" the version players should run? Players on other versions show as outdated.',()=>post('admin/core',{sha256:v.sha256,label:v.label,notes:v.notes,latest:true})));td.append(mark);}
      const remove=document.createElement('button');remove.type='button';remove.className='quiet danger';remove.textContent='Delete';
      remove.addEventListener('click',()=>confirmed('Delete "'+v.label+'" from the list? Players using it will show as "Not in the version list".',()=>post('admin/core/delete',{sha256:v.sha256})));td.append(remove);tr.append(td);tbody.append(tr);}}
  catch(error){empty(tbody,error.message,5);}
}
$('core-file').addEventListener('change',async()=>{const file=$('core-file').files[0];if(!file)return;$('core-hash').value='Hashing…';
  try{$('core-hash').value=await sha256Hex(file);}catch{$('core-hash').value='';$('admin-message').textContent='Could not read that file.';}});
submitter('core-form',()=>post('admin/core',{sha256:$('core-hash').value.trim().toLowerCase(),label:$('core-label').value.trim(),notes:$('core-notes').value.trim(),latest:$('core-latest').checked}));
async function confirmed(question,action){if(!confirm(question))return;try{await action();await loadAdmin();}catch(error){$('admin-message').textContent=error.message;}}
function submitter(id,send,reset=true){$(id).addEventListener('submit',async event=>{event.preventDefault();const button=$(id).querySelector('button.primary');button.disabled=true;
  try{await send();if(reset)$(id).reset();await loadAdmin();}catch(error){$('admin-message').textContent=error.message;}finally{button.disabled=false;}});}
submitter('server-form',()=>post('admin/servers',{name:$('server-name').value}));
submitter('owner-form',()=>{const password=$('owner-pass').value;$('owner-pass').value='';return post('admin/owners',{serverId:$('owner-server').value,username:$('owner-user').value.trim(),password});});
submitter('kafra-form',async()=>{const result=await post('admin/servers/kafra',{id:managed.id,enabled:$('kafra-enabled').checked,plan:$('kafra-plan').value,gateUrl:$('kafra-gate').value,gateKey:$('kafra-key').value});
  if(result.protectionRestored===false)alert('Saved as Kafra Guard. The gate could not be reached to switch protection back on — check it on the Kafra Guard page.');},false);
// Kafra Guard: one login server, up to 50 players online. Pro: up to 16 sub-servers, any limit (0 = none).
function licenseLimits(s){const pro=s.kafraPlan==='pro',max=$('license-max');
  $('license-realms').disabled=!pro;if(!pro)$('license-realms').value='';
  $('license-realms').placeholder=pro?'renewal, classic, revo':'Kafra Guard Pro: one license for several sub-servers';
  max.max=pro?'100000':'50';max.min=pro?'0':'1';if(!pro&&(Number(max.value)===0||Number(max.value)>50))max.value='50';
  $('license-max-label').textContent=pro?'Max players online per sub-server (0 = no limit)':'Max players online (Kafra Guard: up to 50)';}
async function loadLicenses(){
  const tbody=$('licenses');
  try{const {licenses}=await post('admin/licenses',{id:managed.id});if(!licenses.length){empty(tbody,'No licenses issued yet.',6);return;}tbody.replaceChildren();
    for(const l of licenses){const row=document.createElement('tr');cell(row,l.server,true);cell(row,l.realms?.length?l.realms.join(', '):'Single server');cell(row,l.expiresAt);cell(row,l.maxOnline?String(l.maxOnline):'No limit');cell(row,date(l.issuedAt));
      const td=document.createElement('td'),copy=document.createElement('button');copy.type='button';copy.className='quiet';copy.textContent='Copy';
      copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(l.license);copy.textContent='Copied ✓';}catch{prompt('Copy the license:',l.license);}});td.append(copy);row.append(td);tbody.append(row);}}
  catch(error){empty(tbody,error.message,6);}
}
submitter('license-form',async()=>{const realms=$('license-realms').value.split(',').map(r=>r.trim().toLowerCase()).filter(Boolean);
  const result=await post('admin/license',{id:managed.id,server:$('license-server').value.trim(),realms,expiresAt:$('license-expires').value,maxOnline:Number($('license-max').value||0)});
  $('license-output').hidden=false;$('license-value').textContent=result.license;$('copy-license').textContent='Copy license';},false);
$('copy-license').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('license-value').textContent.trim());$('copy-license').textContent='Copied ✓';}catch{$('copy-license').textContent='Select the code and press Ctrl+C';}});
$('copy-key').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('key-value').textContent.trim());$('copy-key').textContent='Copied ✓';}catch{$('copy-key').textContent='Select the code and press Ctrl+C';}});
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
$('server').addEventListener('change',()=>{server=$('server').value;state.offset=0;$('module-panel').hidden=true;load();loadLimits();});
$('moro-server').addEventListener('change',()=>{moroServer=$('moro-server').value;loadMoro();});
$('refresh').addEventListener('click',load);$('builds-refresh').addEventListener('click',loadBuilds);$('moro-refresh').addEventListener('click',loadMoro);$('search').addEventListener('input',render);$('close-modules').addEventListener('click',()=>{$('module-panel').hidden=true;});
$('previous').addEventListener('click',()=>{state.offset=Math.max(0,state.offset-50);load();});$('next').addEventListener('click',()=>{state.offset+=50;load();});
api('me').then(me=>{showDashboard(me);
  if(returned.linked||returned.sso_error){view('settings');$('settings-message').textContent=returned.linked?providerNames[returned.linked]+' is now linked. You can use it to sign in.':ssoErrors[returned.sso_error]??'Linking failed. Please try again.';}
}).catch(()=>{showLogin();if(returned.sso_error)$('login-error').textContent=ssoErrors[returned.sso_error]??'Sign-in failed. Please try again.';});
