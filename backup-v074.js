/* TripKhata v0.7.4b — Firebase + Google Drive backup safety */
(function(){
'use strict';
const CLOUD_PREF='tripkhata_backup_schedule_v074';
const CLOUD_LAST='tripkhata_backup_last_v074';
const DRIVE_PREF='tripkhata_drive_backup_schedule_v074';
const DRIVE_LAST='tripkhata_drive_backup_last_v074';
const DRIVE_FOLDER='tripkhata_drive_folder_v074';
const DRIVE_TOKEN='tripkhata_drive_token_session_v074';
const KEEP_KEYS=['tripkhata_khatabook_v1','tripkhata_state','tripkhata_data','tripkhata_backup','tripkhata_profile','tripkhata_settings'];
const $=s=>document.querySelector(s);

function clean(x){
  try{return JSON.parse(JSON.stringify(x,(k,v)=>{
    if(typeof v==='string'&&v.startsWith('data:image/'))return '[image omitted from lightweight backup]';
    if(typeof v==='string'&&v.length>250000)return '[large value omitted]';
    return v;
  }))}catch(e){return x}
}
function snapshot(){
  let trip=null;
  try{
    if(typeof state!=='undefined'){
      trip=clean(state);
      if(trip&&typeof trip==='object'){delete trip.user;delete trip.cloud;delete trip.login;delete trip.auth}
    }
  }catch(e){}
  const local={};
  KEEP_KEYS.forEach(k=>{
    const v=localStorage.getItem(k);
    if(v!=null&&v.length<2000000)local[k]=v;
  });
  return {createdAt:new Date().toISOString(),version:window.TRIPKHATA_VERSION||'',tripState:trip,local};
}
function intervalMs(v){return v==='daily'?86400000:v==='weekly'?604800000:v==='monthly'?2592000000:0}
function isDue(prefKey,lastKey){
  const pref=localStorage.getItem(prefKey)||'weekly',ms=intervalMs(pref);
  if(!ms)return false;
  const last=Number(localStorage.getItem(lastKey)||0);
  return !last||(Date.now()-last)>=ms;
}
function fmtLast(key){
  const t=Number(localStorage.getItem(key)||0);
  return t?new Date(t).toLocaleString('en-IN'):'No backup yet';
}

/* Firebase backup */
async function saveCloud(reason){
  const u=window.TK_AUTH?.currentUser;
  if(!u)throw new Error('Sign in required for cloud backup.');
  if(!navigator.onLine)throw new Error('Internet connection required.');
  if(!window.firebase?.firestore)throw new Error('Firebase not ready yet.');
  const data=snapshot(),id=String(Date.now()),db=firebase.firestore();
  await db.collection('users').doc(u.uid).collection('backups').doc(id).set({
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    createdAtClient:Date.now(),
    reason:reason||'manual',
    version:window.TRIPKHATA_VERSION||'',
    snapshot:data
  });
  localStorage.setItem(CLOUD_LAST,String(Date.now()));
  return data;
}
async function autoCloud(){
  if(!isDue(CLOUD_PREF,CLOUD_LAST))return;
  if(!window.TK_AUTH?.currentUser||!navigator.onLine)return;
  try{await saveCloud('scheduled')}catch(e){console.warn('TripKhata scheduled cloud backup',e)}
}

/* Google Drive backup using Firebase Google OAuth drive.file scope.
   Token is deliberately session-only; user must reconnect after session/token expiry. */
function driveToken(){return sessionStorage.getItem(DRIVE_TOKEN)||''}
function setDriveToken(t){if(t)sessionStorage.setItem(DRIVE_TOKEN,t);else sessionStorage.removeItem(DRIVE_TOKEN)}
function hasGoogleProvider(u){return !!u?.providerData?.some(p=>p.providerId==='google.com')}
async function connectDrive(){
  if(!window.firebase?.auth||!window.TK_AUTH)throw new Error('Google login is not ready yet.');
  const u=window.TK_AUTH.currentUser;
  if(!u)throw new Error('Please sign in first.');
  const provider=new firebase.auth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({prompt:'consent'});
  let result;
  if(hasGoogleProvider(u)){
    result=await u.reauthenticateWithPopup(provider);
  }else{
    result=await u.linkWithPopup(provider);
  }
  const cred=result?.credential||firebase.auth.GoogleAuthProvider.credentialFromResult?.(result);
  const token=cred?.accessToken;
  if(!token)throw new Error('Google Drive permission token was not returned.');
  setDriveToken(token);
  await ensureDriveFolder(token);
  return true;
}
async function driveFetch(url,opt={}){
  const token=driveToken();
  if(!token)throw new Error('Google Drive is not connected for this session.');
  const headers=Object.assign({},opt.headers||{},{Authorization:'Bearer '+token});
  const r=await fetch(url,Object.assign({},opt,{headers}));
  if(r.status===401||r.status===403){
    setDriveToken('');
    throw new Error('Google Drive permission expired. Tap Connect Google Drive again.');
  }
  if(!r.ok){
    let msg='Google Drive error '+r.status;
    try{const j=await r.json();msg=j?.error?.message||msg}catch(e){}
    throw new Error(msg);
  }
  return r;
}
async function ensureDriveFolder(token){
  let id=localStorage.getItem(DRIVE_FOLDER);
  if(id)return id;
  const qstr=encodeURIComponent("name='TripKhata Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const r=await driveFetch('https://www.googleapis.com/drive/v3/files?q='+qstr+'&spaces=drive&fields=files(id,name)&pageSize=10');
  const j=await r.json();
  id=j.files?.[0]?.id||'';
  if(!id){
    const cr=await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:'TripKhata Backups',mimeType:'application/vnd.google-apps.folder'})
    });
    id=(await cr.json()).id;
  }
  localStorage.setItem(DRIVE_FOLDER,id);
  return id;
}
async function saveDrive(reason){
  if(!navigator.onLine)throw new Error('Internet connection required.');
  const token=driveToken();
  if(!token)throw new Error('Connect Google Drive first.');
  const folder=await ensureDriveFolder(token),data=snapshot();
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const name='TripKhata Backup '+stamp+'.json';
  const meta={name,parents:[folder],description:'TripKhata '+(reason||'manual')+' backup'};
  const boundary='----TripKhata'+Date.now();
  const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+
    '\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(data)+
    '\r\n--'+boundary+'--';
  const r=await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime',{
    method:'POST',
    headers:{'Content-Type':'multipart/related; boundary='+boundary},
    body
  });
  const out=await r.json();
  localStorage.setItem(DRIVE_LAST,String(Date.now()));
  return out;
}
async function autoDrive(){
  if(!isDue(DRIVE_PREF,DRIVE_LAST))return;
  if(!driveToken()||!navigator.onLine)return;
  try{await saveDrive('scheduled')}catch(e){console.warn('TripKhata scheduled Drive backup',e)}
}

/* Manual file backup */
function backupBlob(){
  return new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'});
}
function downloadBackup(){
  const blob=backupBlob(),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='TripKhata-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function shareBackup(){
  const blob=backupBlob(),file=new File([blob],'TripKhata-backup-'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
  try{
    if(navigator.canShare?.({files:[file]})){await navigator.share({title:'TripKhata Backup',text:'TripKhata backup file',files:[file]});return}
  }catch(e){}
  downloadBackup();
  alert('Backup file download ho gayi. Gmail/Drive/WhatsApp nal manually share kar sakde ho.');
}

function card(){
  const set=$('#page-settings');if(!set)return;
  const old=$('#tkBackupCard');if(old)old.remove();
  const driveConnected=!!driveToken();
  const c=document.createElement('div');c.id='tkBackupCard';c.className='card';
  c.innerHTML=
  '<div class="cardtitle">☁ Backup & Data Safety</div>'+
  '<div class="muted small" style="margin-top:4px">Keep a recovery copy separate from live sync.</div>'+
  '<div style="margin-top:14px;padding:12px;border:1px solid #e1e7ef;border-radius:12px">'+
    '<b>Firebase Cloud Backup</b><div style="font-size:11px;color:#7b8797;margin-top:3px">Automatic lightweight account backup while TripKhata is active.</div>'+
    '<label style="display:block;margin-top:10px;font-size:12px;font-weight:800;color:#5f6c7d">Schedule<select id="tkBackupFreq" style="width:100%;margin-top:6px;padding:11px;border:1px solid #dbe4ef;border-radius:10px"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="off">Off</option></select></label>'+
    '<div id="tkBackupLast" style="margin-top:8px;font-size:11px;color:#7b8797">Last: '+fmtLast(CLOUD_LAST)+'</div>'+
    '<button id="tkBackupNow" style="width:100%;margin-top:9px;padding:11px;border:0;border-radius:10px;background:#1558b0;color:#fff;font-weight:900">Backup Now</button>'+
  '</div>'+
  '<div style="margin-top:12px;padding:12px;border:1px solid #e1e7ef;border-radius:12px">'+
    '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>Google Drive Backup</b><div style="font-size:11px;color:#7b8797;margin-top:3px">Saves files inside “TripKhata Backups” in your Drive.</div></div><span id="tkDriveStatus" style="font-size:10px;font-weight:900;color:'+(driveConnected?'#15824d':'#8a6570')+'">'+(driveConnected?'CONNECTED':'NOT CONNECTED')+'</span></div>'+
    '<button id="tkDriveConnect" style="width:100%;margin-top:10px;padding:11px;border:1px solid #d6e0ee;border-radius:10px;background:#fff;color:#1558b0;font-weight:900">'+(driveConnected?'Reconnect Google Drive':'Connect Google Drive')+'</button>'+
    '<label style="display:block;margin-top:10px;font-size:12px;font-weight:800;color:#5f6c7d">Drive Auto Backup<select id="tkDriveFreq" style="width:100%;margin-top:6px;padding:11px;border:1px solid #dbe4ef;border-radius:10px"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="off">Off</option></select></label>'+
    '<div id="tkDriveLast" style="margin-top:8px;font-size:11px;color:#7b8797">Last: '+fmtLast(DRIVE_LAST)+'</div>'+
    '<button id="tkDriveNow" style="width:100%;margin-top:9px;padding:11px;border:0;border-radius:10px;background:#168a4b;color:#fff;font-weight:900">Backup to Drive Now</button>'+
    '<div style="margin-top:8px;font-size:10px;line-height:1.45;color:#8a95a4">Google permission is required once per session/token expiry. Fully unattended backup while the app is closed needs a later backend refresh-token setup.</div>'+
  '</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button id="tkShareBackup" style="padding:11px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#1558b0;font-weight:900">Share Backup</button><button id="tkDownloadBackup" style="padding:11px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#1558b0;font-weight:900">Download File</button></div>';

  set.appendChild(c);
  const cf=$('#tkBackupFreq');cf.value=localStorage.getItem(CLOUD_PREF)||'weekly';cf.onchange=()=>{localStorage.setItem(CLOUD_PREF,cf.value);autoCloud()};
  const df=$('#tkDriveFreq');df.value=localStorage.getItem(DRIVE_PREF)||'weekly';df.onchange=()=>{localStorage.setItem(DRIVE_PREF,df.value);autoDrive()};

  $('#tkBackupNow').onclick=async()=>{
    const b=$('#tkBackupNow');b.disabled=true;b.textContent='Backing up…';
    try{await saveCloud('manual');$('#tkBackupLast').textContent='Last: '+fmtLast(CLOUD_LAST);alert('Firebase cloud backup complete.')}
    catch(e){alert('Backup error: '+e.message)}
    finally{b.disabled=false;b.textContent='Backup Now'}
  };
  $('#tkDriveConnect').onclick=async()=>{
    const b=$('#tkDriveConnect');b.disabled=true;b.textContent='Connecting…';
    try{await connectDrive();alert('Google Drive connected.');card()}
    catch(e){alert('Drive connect error: '+e.message);b.disabled=false;b.textContent='Connect Google Drive'}
  };
  $('#tkDriveNow').onclick=async()=>{
    const b=$('#tkDriveNow');b.disabled=true;b.textContent='Uploading…';
    try{await saveDrive('manual');$('#tkDriveLast').textContent='Last: '+fmtLast(DRIVE_LAST);alert('Google Drive backup complete.')}
    catch(e){alert('Drive backup error: '+e.message)}
    finally{b.disabled=false;b.textContent='Backup to Drive Now'}
  };
  $('#tkShareBackup').onclick=shareBackup;
  $('#tkDownloadBackup').onclick=downloadBackup;
}

window.tripKhataBackupNow=()=>saveCloud('manual');
window.tripKhataDriveConnect=connectDrive;
window.tripKhataDriveBackupNow=()=>saveDrive('manual');
window.tripKhataShareBackup=shareBackup;

async function autoAll(){await autoCloud();await autoDrive()}
window.addEventListener('online',()=>setTimeout(autoAll,1500));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(autoAll,1200)});
setTimeout(autoAll,3500);
setInterval(autoAll,300000);
setInterval(card,2200);
})();