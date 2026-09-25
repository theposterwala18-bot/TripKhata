/* TripKhata v0.8.0 — shared trip beta + audit foundation */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const DEVICE=localStorage.getItem('tripkhata_device_id')||('web_'+Date.now().toString(36));
let off=null,pushTimer=null,applying=false;
function user(){return window.TK_AUTH?.currentUser||null}
function trip(){try{return typeof getTrip==='function'?getTrip():null}catch(e){return null}}
function firestore(){return window.firebase?.firestore?firebase.firestore():null}
function clean(x){try{return JSON.parse(JSON.stringify(x,(k,v)=>typeof v==='string'&&v.startsWith('data:image/')?null:v))}catch(e){return null}}
function code(){return 'TK'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,7).toUpperCase()}
function role(t){const u=user();if(!u||!t?.sharedTrip)return'';return t.sharedTrip.ownerUid===u.uid?'Owner':'Member'}
function audit(msg){
  const t=trip();if(!t)return;
  t.auditTrail=Array.isArray(t.auditTrail)?t.auditTrail:[];
  t.auditTrail.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),message:String(msg),actor:user()?.displayName||user()?.email||'User',actorUid:user()?.uid||'',at:new Date().toISOString()});
  if(t.auditTrail.length>200)t.auditTrail.length=200;
}
function err(e){
  if(e?.code==='permission-denied'||String(e?.message||'').includes('permission'))return 'Firestore shared-trip permission is not enabled yet. Shared Trip rules need to be deployed first.';
  return e?.message||String(e);
}
function currentSnapshot(){
  const t=trip();if(!t)return null;
  const x=clean(t);if(x){delete x.auditTrail;x.auditTrail=clean(t.auditTrail||[])}
  return x;
}
async function createShare(){
  const u=user(),t=trip(),db=firestore();
  if(!u)return alert('Shared Trip layi pehla login karo.');
  if(!t)return alert('Pehla koi trip open/create karo.');
  if(!db)return alert('Cloud not ready yet.');
  let id=t.sharedTrip?.code||code();
  const meta={code:id,ownerUid:u.uid,ownerEmail:u.email||'',role:'owner',createdAt:t.sharedTrip?.createdAt||new Date().toISOString()};
  t.sharedTrip=meta;audit('Shared Trip created');
  try{if(typeof save==='function')save()}catch(e){}
  try{
    await db.collection('sharedTrips').doc(id).set({
      code:id,ownerUid:u.uid,ownerEmail:u.email||'',name:t.name||'Shared Trip',
      memberUids:{[u.uid]:{email:u.email||'',name:u.displayName||'',role:'owner',joinedAt:Date.now()}},
      snapshot:currentSnapshot(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now(),updatedBy:u.uid,updatedDevice:DEVICE
    },{merge:true});
    startWatch(id);
    copyInvite(id);
    refreshCard();
    alert('Shared Trip ready. Invite code copied: '+id);
  }catch(e){alert(err(e))}
}
async function joinShare(id){
  id=String(id||'').trim().toUpperCase();
  const u=user(),t=trip(),db=firestore();
  if(!u)return alert('Join karan layi login karo.');
  if(!t)return alert('Join karan ton pehla ik blank/new trip open karo. Shared data current open trip vich load hovega.');
  if(!id)return alert('Invite code enter karo.');
  if(!db)return alert('Cloud not ready yet.');
  try{
    const ref=db.collection('sharedTrips').doc(id),snap=await ref.get();
    if(!snap.exists)return alert('Invite code not found.');
    const d=snap.data()||{};
    if(!d.snapshot)return alert('Shared trip data missing.');
    if(!confirm('Current open trip nu shared trip "'+(d.name||id)+'" nal replace/sync karna?'))return;
    applying=true;
    Object.keys(t).forEach(k=>delete t[k]);
    Object.assign(t,clean(d.snapshot));
    t.sharedTrip={code:id,ownerUid:d.ownerUid||'',ownerEmail:d.ownerEmail||'',role:d.ownerUid===u.uid?'owner':'member',joinedAt:new Date().toISOString()};
    audit('Joined shared trip');
    if(typeof save==='function')save();
    applying=false;
    await ref.set({memberUids:{[u.uid]:{email:u.email||'',name:u.displayName||'',role:d.ownerUid===u.uid?'owner':'member',joinedAt:Date.now()}},updatedAtClient:Date.now()},{merge:true});
    startWatch(id);
    if(typeof renderTrip==='function')renderTrip();
    refreshCard();
    alert('Shared Trip joined.');
  }catch(e){applying=false;alert(err(e))}
}
async function pushShared(){
  if(applying)return;
  const u=user(),t=trip(),db=firestore(),id=t?.sharedTrip?.code;
  if(!u||!t||!db||!id||!navigator.onLine)return;
  try{
    await db.collection('sharedTrips').doc(id).set({
      name:t.name||'Shared Trip',snapshot:currentSnapshot(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now(),updatedBy:u.uid,updatedDevice:DEVICE
    },{merge:true});
  }catch(e){console.warn('Shared trip push',e)}
}
function schedulePush(){clearTimeout(pushTimer);pushTimer=setTimeout(pushShared,650)}
function applyRemote(data){
  const t=trip(),u=user();if(!t||!data?.snapshot||data.updatedDevice===DEVICE)return;
  if(t.sharedTrip?.code!==data.code&&t.sharedTrip?.code!==data.snapshot?.sharedTrip?.code)return;
  applying=true;
  const keepShared=clean(t.sharedTrip);
  Object.keys(t).forEach(k=>delete t[k]);
  Object.assign(t,clean(data.snapshot));
  if(keepShared)t.sharedTrip=keepShared;
  audit('Realtime update received');
  try{if(typeof save==='function')save()}catch(e){}
  applying=false;
  if(typeof renderTrip==='function')setTimeout(renderTrip,60);
}
function startWatch(id){
  if(off){off();off=null}
  const db=firestore();if(!db||!id)return;
  off=db.collection('sharedTrips').doc(id).onSnapshot(s=>{if(s.exists)applyRemote(Object.assign({code:id},s.data()||{}))},e=>console.warn('Shared watch',e));
}
function copyInvite(id){
  const link=location.origin+location.pathname+'?join='+encodeURIComponent(id);
  const txt='Join my TripKhata trip\nCode: '+id+'\n'+link;
  if(navigator.share){navigator.share({title:'TripKhata Shared Trip',text:txt,url:link}).catch(()=>navigator.clipboard?.writeText(txt))}
  else navigator.clipboard?.writeText(txt);
}
function showJoin(){
  const v=prompt('Enter Shared Trip invite code');
  if(v)joinShare(v);
}
function showAudit(){
  const t=trip();if(!t)return alert('Open a trip first.');
  const a=(t.auditTrail||[]).slice(0,100);
  const w=window.open('','_blank');if(!w)return alert('Popup blocked.');
  w.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trip Activity</title><style>body{font-family:system-ui;max-width:760px;margin:20px auto;padding:0 14px}h1{color:#1558b0}.r{padding:12px 0;border-bottom:1px solid #e5e8ed}.r small{display:block;color:#7b8797;margin-top:4px}</style><h1>Trip Activity</h1>'+(a.map(x=>'<div class="r"><b>'+esc(x.message)+'</b><small>'+esc(x.actor||'')+' • '+new Date(x.at).toLocaleString()+'</small></div>').join('')||'<p>No activity yet.</p>'));
  w.document.close();
}
function card(){
  const set=$('#page-settings');if(!set||$('#tkSharedCard'))return;
  const t=trip(),s=t?.sharedTrip;
  const c=document.createElement('div');c.id='tkSharedCard';c.className='card';
  c.innerHTML='<div class="cardtitle">👥 Shared Trip (Beta)</div><div class="muted small" style="margin-top:4px">Same trip on multiple friends’ phones using invite code + realtime cloud sync.</div>'+
    (s?'<div style="margin-top:10px;padding:11px;background:#f3f7fc;border-radius:11px"><b>'+esc(s.code)+'</b><div class="muted small">'+esc(role(t))+' • '+esc(s.ownerEmail||'')+'</div></div>':'')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button id="tkShareCreate" class="btn primary">'+(s?'Share Invite Again':'Share Current Trip')+'</button><button id="tkShareJoin" class="btn soft">Join by Code</button></div>'+
    '<button id="tkShareAudit" class="btn soft" style="width:100%;margin-top:8px">View Activity / Audit Trail</button>';
  set.appendChild(c);
  $('#tkShareCreate').onclick=()=>s?copyInvite(s.code):createShare();
  $('#tkShareJoin').onclick=showJoin;
  $('#tkShareAudit').onclick=showAudit;
}
function refreshCard(){$('#tkSharedCard')?.remove();card()}

const oldSave=window.save;if(typeof oldSave==='function'&&!oldSave.__tkShared){
  const w=function(){const r=oldSave.apply(this,arguments);if(!applying)schedulePush();return r};w.__tkShared=true;window.save=w;
}
const oldActivity=window.activity;if(typeof oldActivity==='function'&&!oldActivity.__tkAudit){
  const w=function(msg){const r=oldActivity.apply(this,arguments);audit(msg);return r};w.__tkAudit=true;window.activity=w;
}
const q=new URLSearchParams(location.search).get('join');if(q)localStorage.setItem('tripkhata_pending_join',q.toUpperCase());
setTimeout(()=>{const t=trip();if(t?.sharedTrip?.code)startWatch(t.sharedTrip.code);card();const p=localStorage.getItem('tripkhata_pending_join');if(p&&user()&&t){localStorage.removeItem('tripkhata_pending_join');setTimeout(()=>joinShare(p),300)}},2200);
const oldRS=window.renderSettings;if(typeof oldRS==='function'&&!oldRS.__tkShared){const w=function(){const r=oldRS.apply(this,arguments);setTimeout(card,0);return r};w.__tkShared=true;window.renderSettings=w}
window.tripKhataShareCurrentTrip=createShare;window.tripKhataJoinSharedTrip=joinShare;window.tripKhataSharedAudit=showAudit;
})();