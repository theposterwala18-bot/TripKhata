/* TripKhata v0.7.4 — safe cloud backup scheduler + share/export backup */
(function(){
'use strict';
const PREF='tripkhata_backup_schedule_v074';
const LAST='tripkhata_backup_last_v074';
const KEEP_KEYS=['tripkhata_khatabook_v1','tripkhata_state','tripkhata_data','tripkhata_backup','tripkhata_profile','tripkhata_settings'];
const $=s=>document.querySelector(s);
function clean(x){try{return JSON.parse(JSON.stringify(x,(k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/'))return '[image omitted from lightweight backup]';if(typeof v==='string'&&v.length>250000)return '[large value omitted]';return v}))}catch(e){return x}}
function snapshot(){
  let trip=null;try{if(typeof state!=='undefined'){trip=clean(state);if(trip&&typeof trip==='object'){delete trip.user;delete trip.cloud;delete trip.login;delete trip.auth}}}catch(e){}
  const local={};KEEP_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!=null&&v.length<2000000)local[k]=v});
  return {createdAt:new Date().toISOString(),version:window.TRIPKHATA_VERSION||'',tripState:trip,local};
}
function intervalMs(v){return v==='daily'?86400000:v==='weekly'?604800000:v==='monthly'?2592000000:0}
function due(){
  const pref=localStorage.getItem(PREF)||'weekly',ms=intervalMs(pref);if(!ms)return false;
  const last=Number(localStorage.getItem(LAST)||0);return !last||(Date.now()-last)>=ms;
}
async function saveCloud(reason){
  const u=window.TK_AUTH?.currentUser;
  if(!u)throw new Error('Sign in required for cloud backup.');
  if(!navigator.onLine)throw new Error('Internet connection required.');
  if(!window.firebase?.firestore)throw new Error('Firebase not ready yet.');
  const data=snapshot(),id=String(Date.now());
  const db=firebase.firestore();
  await db.collection('users').doc(u.uid).collection('backups').doc(id).set({
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    createdAtClient:Date.now(),
    reason:reason||'manual',
    version:window.TRIPKHATA_VERSION||'',
    snapshot:data
  });
  localStorage.setItem(LAST,String(Date.now()));
  return data;
}
async function auto(){
  if(!due())return;
  if(!window.TK_AUTH?.currentUser||!navigator.onLine)return;
  try{await saveCloud('scheduled')}catch(e){console.warn('TripKhata scheduled backup',e)}
}
function downloadBackup(){
  const data=snapshot(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='TripKhata-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function shareBackup(){
  const data=snapshot(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),file=new File([blob],'TripKhata-backup-'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
  try{
    if(navigator.canShare?.({files:[file]})){await navigator.share({title:'TripKhata Backup',text:'TripKhata backup file',files:[file]});return}
  }catch(e){}
  downloadBackup();
  alert('Backup file download ho gayi. Gmail/Drive/WhatsApp nal manually share kar sakde ho.');
}
function fmtLast(){
  const t=Number(localStorage.getItem(LAST)||0);return t?new Date(t).toLocaleString('en-IN'):'No backup yet';
}
function card(){
  const set=$('#page-settings');if(!set)return;
  if($('#tkBackupCard'))return;
  const c=document.createElement('div');c.id='tkBackupCard';c.className='card';
  c.innerHTML='<div class="cardtitle">☁ Backup & Data Safety</div><div class="muted small" style="margin-top:4px">Automatic lightweight cloud backup runs when TripKhata is opened/active and the selected interval is due.</div>'+
  '<label style="display:block;margin-top:12px;font-size:12px;font-weight:800;color:#5f6c7d">Auto Backup<select id="tkBackupFreq" style="width:100%;margin-top:6px;padding:11px;border:1px solid #dbe4ef;border-radius:10px"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="off">Off</option></select></label>'+
  '<div id="tkBackupLast" style="margin-top:9px;font-size:11px;color:#7b8797">Last backup: '+fmtLast()+'</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button id="tkBackupNow" style="padding:11px;border:0;border-radius:10px;background:#1558b0;color:#fff;font-weight:900">Backup Now</button><button id="tkShareBackup" style="padding:11px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#1558b0;font-weight:900">Share Backup</button></div>'+
  '<button id="tkDownloadBackup" style="width:100%;margin-top:8px;padding:11px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#1558b0;font-weight:900">Download Backup File</button>'+
  '<div style="margin-top:9px;font-size:10px;line-height:1.45;color:#8a95a4">Note: browser/web-wrapper cannot silently send Gmail attachments in background without separate Google/Gmail authorization. Scheduled protection here is Firebase cloud backup. Share Backup lets you send the file through Gmail/Drive/WhatsApp when supported.</div>';
  set.appendChild(c);
  const freq=$('#tkBackupFreq');freq.value=localStorage.getItem(PREF)||'weekly';freq.onchange=()=>{localStorage.setItem(PREF,freq.value);auto()};
  $('#tkBackupNow').onclick=async()=>{const b=$('#tkBackupNow');b.disabled=true;b.textContent='Backing up…';try{await saveCloud('manual');$('#tkBackupLast').textContent='Last backup: '+fmtLast();alert('Cloud backup complete.')}catch(e){alert('Backup error: '+e.message)}finally{b.disabled=false;b.textContent='Backup Now'}};
  $('#tkShareBackup').onclick=shareBackup;$('#tkDownloadBackup').onclick=downloadBackup;
}
window.tripKhataBackupNow=()=>saveCloud('manual');
window.tripKhataShareBackup=shareBackup;
window.addEventListener('online',()=>setTimeout(auto,1500));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(auto,1200)});
setTimeout(auto,3500);
setInterval(card,1800);
})();