/* TripKhata v0.9.0 — Secure Shared Trip realtime system */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const DEVICE=localStorage.getItem('tripkhata_device_id')||('d_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8));
const PENDING='tripkhata_pending_shared_invite_v090';
let stateOff=null,metaOff=null,membersOff=null,pushTimer=null,applying=false,lastRev=0,membersCache=[];

function user(){return window.TK_AUTH?.currentUser||null}
function trip(){try{return typeof getTrip==='function'?getTrip():null}catch(e){return null}}
function fs(){return window.firebase?.firestore?firebase.firestore():null}
function clean(x){try{return JSON.parse(JSON.stringify(x,(k,v)=>typeof v==='string'&&v.startsWith('data:image/')?null:v))}catch(e){return null}}
function tripId(){return 'ST'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,10).toUpperCase()}
function inviteCode(){return 'J'+Math.random().toString(36).slice(2,6).toUpperCase()+Date.now().toString(36).slice(-4).toUpperCase()}
function refs(id){const db=fs(),base=db.collection('sharedTrips').doc(id);return {base,state:base.collection('state').doc('main'),members:base.collection('members'),audit:base.collection('audit')}}
function myRole(){
  const u=user(),t=trip(),s=t?.sharedTrip;if(!u||!s)return '';
  if(s.ownerUid===u.uid)return 'owner';
  return s.role||membersCache.find(m=>m.uid===u.uid)?.role||'member';
}
function canWrite(){return ['owner','admin','member'].includes(myRole())}
function isOwner(){return myRole()==='owner'}
function roleLabel(r){return r==='owner'?'Owner':r==='admin'?'Admin':r==='viewer'?'Viewer':'Member'}
function err(e){
  if(e?.code==='permission-denied'||String(e?.message||'').toLowerCase().includes('permission'))return 'Shared Trip security permission haje deploy nahi hoi. Firestore Shared Trip rules enable karniyan ne.';
  return e?.message||String(e);
}
function toast(s){if(typeof toastMsg==='function')toastMsg(s);else console.log(s)}
function currentSnapshot(){
  const t=trip();if(!t)return null;
  const x=clean(t);
  if(x?.sharedTrip){x.sharedTrip=clean(t.sharedTrip)}
  return x;
}
async function addAudit(action,detail){
  const u=user(),t=trip(),id=t?.sharedTrip?.tripId;if(!u||!id||!fs())return;
  try{
    await refs(id).audit.add({
      action:String(action||''),detail:String(detail||''),actorUid:u.uid,
      actorName:u.displayName||u.email||'User',actorEmail:u.email||'',
      at:firebase.firestore.FieldValue.serverTimestamp(),atClient:Date.now(),device:DEVICE
    });
  }catch(e){console.warn('Shared audit',e)}
}
function localAudit(action,detail){
  const t=trip();if(!t)return;
  t.auditTrail=Array.isArray(t.auditTrail)?t.auditTrail:[];
  t.auditTrail.unshift({id:'sa_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),message:String(action)+(detail?' • '+detail:''),actor:user()?.displayName||user()?.email||'User',actorUid:user()?.uid||'',at:new Date().toISOString(),shared:true});
  if(t.auditTrail.length>200)t.auditTrail.length=200;
}
function saveLocal(){
  try{if(typeof save==='function')save()}catch(e){console.warn(e)}
}
function detach(){
  if(stateOff){stateOff();stateOff=null}
  if(metaOff){metaOff();metaOff=null}
  if(membersOff){membersOff();membersOff=null}
  membersCache=[];lastRev=0;
}
async function createInvite(id,ownerUid){
  const code=inviteCode();
  await fs().collection('sharedTripInvites').doc(code).set({
    tripId:id,ownerUid,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtClient:Date.now()
  });
  return code;
}
async function createShare(){
  const u=user(),t=trip(),db=fs();
  if(!u)return alert('Shared Trip layi pehla login karo.');
  if(!t)return alert('Pehla trip open/create karo.');
  if(!db)return alert('Cloud haje ready nahi.');
  if(t.sharedTrip?.tripId)return openManage();

  const id=tripId();
  try{
    const code=inviteCode(),r=refs(id),batch=db.batch();
    batch.set(r.base,{
      name:t.name||'Shared Trip',ownerUid:u.uid,ownerEmail:u.email||'',currentInviteCode:code,inviteActive:true,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtClient:Date.now(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now()
    });
    batch.set(db.collection('sharedTripInvites').doc(code),{tripId:id,ownerUid:u.uid,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtClient:Date.now()});
    batch.set(r.members.doc(u.uid),{uid:u.uid,email:u.email||'',name:u.displayName||u.email||'Owner',role:'owner',joinedAt:firebase.firestore.FieldValue.serverTimestamp(),joinedAtClient:Date.now()});
    t.sharedTrip={tripId:id,inviteCode:code,ownerUid:u.uid,ownerEmail:u.email||'',role:'owner',joinedAt:new Date().toISOString()};
    localAudit('Shared Trip created',code);saveLocal();
    batch.set(r.state,{snapshot:currentSnapshot(),revision:1,updatedBy:u.uid,updatedName:u.displayName||u.email||'',updatedDevice:DEVICE,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now()});
    await batch.commit();
    lastRev=1;startWatch(id);await addAudit('Shared Trip created','Invite '+code);refreshCard();shareInvite(code);
  }catch(e){alert(err(e))}
}
async function resolveInvite(code){
  code=String(code||'').trim().toUpperCase();if(!code)throw new Error('Invite code enter karo.');
  const s=await fs().collection('sharedTripInvites').doc(code).get();
  if(!s.exists)throw new Error('Invite code not found.');
  const d=s.data()||{};if(!d.active)throw new Error('Eh invite revoke/expire ho chukka.');
  if(!d.tripId)throw new Error('Invite invalid.');
  return {code,...d};
}
async function joinShare(code){
  const u=user(),t=trip(),db=fs();
  if(!u){localStorage.setItem(PENDING,String(code||'').trim().toUpperCase());return alert('Pehla login karo; invite code safe save ho gaya.')}
  if(!t)return alert('Pehla ik trip open/create karo. Join time current open trip shared trip data nal replace hovega.');
  if(!db)return alert('Cloud haje ready nahi.');
  try{
    const inv=await resolveInvite(code),r=refs(inv.tripId);
    const existing=await r.members.doc(u.uid).get();
    if(!existing.exists){
      await r.members.doc(u.uid).set({
        uid:u.uid,email:u.email||'',name:u.displayName||u.email||'Member',role:'member',
        inviteCode:inv.code,joinedAt:firebase.firestore.FieldValue.serverTimestamp(),joinedAtClient:Date.now()
      });
    }
    const [meta,stateDoc]=await Promise.all([r.base.get(),r.state.get()]);
    if(!meta.exists||!stateDoc.exists)throw new Error('Shared Trip data not found.');
    const m=meta.data()||{},sd=stateDoc.data()||{};
    if(!sd.snapshot)throw new Error('Shared Trip state empty.');
    if(!confirm('Current open trip nu "'+(m.name||'Shared Trip')+'" shared trip nal replace/sync karna?'))return;

    applying=true;
    Object.keys(t).forEach(k=>delete t[k]);
    Object.assign(t,clean(sd.snapshot));
    t.sharedTrip={tripId:inv.tripId,inviteCode:m.currentInviteCode||inv.code,ownerUid:m.ownerUid||inv.ownerUid||'',ownerEmail:m.ownerEmail||'',role:(m.ownerUid===u.uid?'owner':(existing.exists?(existing.data().role||'member'):'member')),joinedAt:new Date().toISOString()};
    localAudit('Joined Shared Trip',inv.code);saveLocal();applying=false;
    lastRev=Number(sd.revision||0);
    await addAudit('Member joined',u.email||u.displayName||u.uid);
    startWatch(inv.tripId);if(typeof renderTrip==='function')renderTrip();refreshCard();alert('Shared Trip joined. Realtime sync ON.');
  }catch(e){applying=false;alert(err(e))}
}
async function pushShared(){
  if(applying)return;
  const u=user(),t=trip(),id=t?.sharedTrip?.tripId,db=fs();
  if(!u||!t||!id||!db||!navigator.onLine||!canWrite())return;
  const r=refs(id),snap=currentSnapshot();
  try{
    await db.runTransaction(async tx=>{
      const cur=await tx.get(r.state),d=cur.exists?(cur.data()||{}):{},rev=Number(d.revision||0);
      const next=rev+1;
      tx.set(r.state,{snapshot:snap,revision:next,updatedBy:u.uid,updatedName:u.displayName||u.email||'',updatedDevice:DEVICE,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now()},{merge:true});
      lastRev=next;
    });
  }catch(e){
    if(e?.code==='permission-denied'){console.warn(err(e));refreshCard()}
    else console.warn('Shared push',e);
  }
}
function schedulePush(){clearTimeout(pushTimer);pushTimer=setTimeout(pushShared,500)}
function applyRemote(d){
  const t=trip();if(!t||!d?.snapshot||d.updatedDevice===DEVICE)return;
  const rev=Number(d.revision||0);if(rev&&rev<=lastRev)return;
  applying=true;
  const localShared=clean(t.sharedTrip);
  Object.keys(t).forEach(k=>delete t[k]);
  Object.assign(t,clean(d.snapshot));
  if(localShared)t.sharedTrip=localShared;
  localAudit('Realtime update received',d.updatedName||'Another member');
  saveLocal();lastRev=rev;applying=false;
  if(typeof renderTrip==='function')setTimeout(renderTrip,40);
  toast('Shared Trip updated');
}
function startWatch(id){
  detach();if(!id||!fs())return;
  const r=refs(id);
  stateOff=r.state.onSnapshot(s=>{if(s.exists)applyRemote(s.data()||{})},e=>{console.warn('Shared state watch',e);if(e.code==='permission-denied')toast('Shared Trip access removed')});
  metaOff=r.base.onSnapshot(s=>{
    if(!s.exists)return;
    const m=s.data()||{},t=trip();if(!t?.sharedTrip||t.sharedTrip.tripId!==id)return;
    t.sharedTrip.ownerUid=m.ownerUid||t.sharedTrip.ownerUid;t.sharedTrip.ownerEmail=m.ownerEmail||t.sharedTrip.ownerEmail;t.sharedTrip.inviteCode=m.currentInviteCode||t.sharedTrip.inviteCode;
    if(user()?.uid===m.ownerUid)t.sharedTrip.role='owner';saveLocal();refreshCard();
  },e=>console.warn('Shared meta watch',e));
  membersOff=r.members.onSnapshot(q=>{
    membersCache=q.docs.map(d=>d.data()||{});const me=membersCache.find(m=>m.uid===user()?.uid),t=trip();
    if(t?.sharedTrip&&me&&t.sharedTrip.tripId===id){t.sharedTrip.role=me.role||'member';saveLocal()}
    refreshCard();
  },e=>console.warn('Shared members watch',e));
}
function shareInvite(code){
  const link=location.origin+location.pathname+'?join='+encodeURIComponent(code);
  const txt='Join my TripKhata Shared Trip\nInvite Code: '+code+'\n'+link;
  if(navigator.share)navigator.share({title:'TripKhata Shared Trip',text:txt,url:link}).catch(()=>navigator.clipboard?.writeText(txt));
  else navigator.clipboard?.writeText(txt).then(()=>alert('Invite copied: '+code)).catch(()=>alert(txt));
}
async function regenerateInvite(){
  const u=user(),t=trip(),s=t?.sharedTrip;if(!u||!s||!isOwner())return alert('Owner only.');
  if(!confirm('Old invite code revoke karke nava code banana? Existing members connected rahange.'))return;
  try{
    const db=fs(),r=refs(s.tripId),old=s.inviteCode,newCode=inviteCode(),batch=db.batch();
    if(old)batch.set(db.collection('sharedTripInvites').doc(old),{active:false,revokedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    batch.set(db.collection('sharedTripInvites').doc(newCode),{tripId:s.tripId,ownerUid:u.uid,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtClient:Date.now()});
    batch.set(r.base,{currentInviteCode:newCode,inviteActive:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    await batch.commit();s.inviteCode=newCode;saveLocal();await addAudit('Invite regenerated',newCode);refreshCard();shareInvite(newCode);
  }catch(e){alert(err(e))}
}
async function revokeInvite(){
  const t=trip(),s=t?.sharedTrip;if(!s||!isOwner())return alert('Owner only.');
  if(!confirm('Current invite revoke karna? Existing members connected rahange, new join band ho ju.'))return;
  try{
    const db=fs(),batch=db.batch();if(s.inviteCode)batch.set(db.collection('sharedTripInvites').doc(s.inviteCode),{active:false,revokedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    batch.set(refs(s.tripId).base,{inviteActive:false,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});await batch.commit();
    await addAudit('Invite revoked',s.inviteCode||'');refreshCard();alert('Invite revoked.');
  }catch(e){alert(err(e))}
}
async function setRole(uid,role){
  const t=trip(),s=t?.sharedTrip;if(!s||!isOwner())return alert('Owner only.');
  if(uid===user()?.uid)return;
  if(!['admin','member','viewer'].includes(role))return;
  try{await refs(s.tripId).members.doc(uid).update({role});await addAudit('Member role changed',uid+' → '+role)}
  catch(e){alert(err(e))}
}
async function removeMember(uid){
  const t=trip(),s=t?.sharedTrip;if(!s||!isOwner())return alert('Owner only.');
  const m=membersCache.find(x=>x.uid===uid);if(!m||m.role==='owner')return;
  if(!confirm('Remove '+(m.name||m.email||'member')+' from Shared Trip?'))return;
  try{await refs(s.tripId).members.doc(uid).delete();await addAudit('Member removed',m.email||m.name||uid)}
  catch(e){alert(err(e))}
}
async function transferOwner(uid){
  const u=user(),t=trip(),s=t?.sharedTrip;if(!u||!s||!isOwner())return alert('Owner only.');
  const m=membersCache.find(x=>x.uid===uid);if(!m)return;
  if(!confirm('Transfer ownership to '+(m.name||m.email||'this member')+'? Tusi Member ban jaoge.'))return;
  try{
    const db=fs(),r=refs(s.tripId),batch=db.batch();
    batch.update(r.base,{ownerUid:uid,ownerEmail:m.email||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    batch.update(r.members.doc(uid),{role:'owner'});
    batch.update(r.members.doc(u.uid),{role:'member'});
    await batch.commit();s.ownerUid=uid;s.ownerEmail=m.email||'';s.role='member';saveLocal();await addAudit('Ownership transferred',m.email||m.name||uid);refreshCard();
  }catch(e){alert(err(e))}
}
async function leaveTrip(){
  const u=user(),t=trip(),s=t?.sharedTrip;if(!u||!s)return;
  if(isOwner())return alert('Owner pehla ownership transfer kare ja Shared Trip delete kare.');
  if(!confirm('Shared Trip leave karna? Local current trip copy device te rahegi, par realtime connection band ho ju.'))return;
  try{
    await refs(s.tripId).members.doc(u.uid).delete();detach();delete t.sharedTrip;localAudit('Left Shared Trip','');saveLocal();refreshCard();alert('Shared Trip left.');
  }catch(e){alert(err(e))}
}
async function deleteShared(){
  const u=user(),t=trip(),s=t?.sharedTrip;if(!u||!s||!isOwner())return alert('Owner only.');
  if(!confirm('Delete Shared Trip cloud copy permanently? Members da realtime connection band ho ju. Local trip copies delete nahi honge.'))return;
  if(prompt('Type DELETE SHARED to confirm')!=='DELETE SHARED')return;
  try{
    const db=fs(),r=refs(s.tripId),[ms,as]=await Promise.all([r.members.get(),r.audit.get()]),batch=db.batch();
    ms.docs.forEach(d=>batch.delete(d.ref));as.docs.forEach(d=>batch.delete(d.ref));batch.delete(r.state);if(s.inviteCode)batch.delete(db.collection('sharedTripInvites').doc(s.inviteCode));batch.delete(r.base);
    await batch.commit();detach();delete t.sharedTrip;localAudit('Shared cloud trip deleted','');saveLocal();refreshCard();alert('Shared cloud trip deleted. Local trip safe aa.');
  }catch(e){alert(err(e))}
}
async function showActivity(){
  const t=trip(),s=t?.sharedTrip;if(!s)return alert('Trip shared nahi.');
  try{
    const q=await refs(s.tripId).audit.orderBy('atClient','desc').limit(100).get(),a=q.docs.map(d=>d.data()||{});
    const w=window.open('','_blank');if(!w)return alert('Popup blocked.');
    w.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shared Trip Activity</title><style>body{font-family:system-ui;max-width:760px;margin:20px auto;padding:0 14px}h1{color:#1558b0}.r{padding:12px 0;border-bottom:1px solid #e4e9ef}.r small{display:block;color:#778397;margin-top:4px}</style><h1>Shared Trip Activity</h1>'+(a.map(x=>'<div class="r"><b>'+esc(x.action||'Activity')+'</b><div>'+esc(x.detail||'')+'</div><small>'+esc(x.actorName||x.actorEmail||'')+' • '+new Date(x.atClient||Date.now()).toLocaleString()+'</small></div>').join('')||'<p>No activity yet.</p>'));w.document.close();
  }catch(e){alert(err(e))}
}
function memberRows(){
  if(!membersCache.length)return '<div class="st90muted">Members loading…</div>';
  return membersCache.map(m=>{
    const owner=m.role==='owner',me=m.uid===user()?.uid;
    return '<div class="st90member"><div><b>'+esc(m.name||m.email||'Member')+(me?' (You)':'')+'</b><small>'+esc(m.email||'')+'</small></div><div class="st90right"><span>'+roleLabel(m.role)+'</span>'+
      (isOwner()&&!owner&&!me?'<select data-role="'+esc(m.uid)+'"><option value="member" '+(m.role==='member'?'selected':'')+'>Member</option><option value="admin" '+(m.role==='admin'?'selected':'')+'>Admin</option><option value="viewer" '+(m.role==='viewer'?'selected':'')+'>Viewer</option></select><button data-transfer="'+esc(m.uid)+'">Owner</button><button data-remove="'+esc(m.uid)+'">Remove</button>':'')+
      '</div></div>';
  }).join('');
}
function manageHTML(){
  const t=trip(),s=t?.sharedTrip;if(!s)return '';
  return '<div class="st90modal"><div class="st90top"><div><b>Shared Trip</b><small>'+esc(t.name||'Trip')+'</small></div><button id="st90close">✕</button></div>'+
    '<div class="st90status"><div><span>Role</span><b>'+roleLabel(myRole())+'</b></div><div><span>Invite</span><b>'+esc(s.inviteCode||'—')+'</b></div><div><span>Sync</span><b>'+(navigator.onLine?'Live':'Offline')+'</b></div></div>'+
    '<div class="st90actions"><button id="st90share">Share Invite</button>'+(isOwner()?'<button id="st90regen">New Invite</button><button id="st90revoke">Revoke Invite</button>':'')+'<button id="st90activity">Activity</button></div>'+
    '<h3>Members</h3><div id="st90members">'+memberRows()+'</div>'+
    (!isOwner()?'<button id="st90leave" class="danger">Leave Shared Trip</button>':'<button id="st90delete" class="danger">Delete Shared Cloud Trip</button>')+
    '<div class="st90note">Owner/Admin/Member can update trip. Viewer is read-only. Existing local TripKhata copy remains available even if shared connection is removed.</div></div>';
}
function openManage(){
  const t=trip(),s=t?.sharedTrip;if(!s?.tripId)return createShare();
  $('#st90shade')?.remove();const d=document.createElement('div');d.id='st90shade';d.className='st90shade';d.innerHTML=manageHTML();document.body.appendChild(d);d.onclick=e=>{if(e.target===d)d.remove()};
  $('#st90close').onclick=()=>d.remove();$('#st90share').onclick=()=>shareInvite(s.inviteCode);
  $('#st90activity').onclick=showActivity;
  $('#st90regen')&&($('#st90regen').onclick=regenerateInvite);$('#st90revoke')&&($('#st90revoke').onclick=revokeInvite);
  $('#st90leave')&&($('#st90leave').onclick=leaveTrip);$('#st90delete')&&($('#st90delete').onclick=deleteShared);
  document.querySelectorAll('[data-role]').forEach(el=>el.onchange=()=>setRole(el.dataset.role,el.value));
  document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>removeMember(el.dataset.remove));
  document.querySelectorAll('[data-transfer]').forEach(el=>el.onclick=()=>transferOwner(el.dataset.transfer));
}
function card(){
  const set=$('#page-settings');if(!set)return;
  $('#tkSharedCard')?.remove();
  const t=trip(),s=t?.sharedTrip,secure=!!t?.sharedTrip?.tripId,c=document.createElement('div');c.id='tkSharedCard';c.className='card';
  c.innerHTML='<div class="cardtitle">👥 Shared Trip</div><div class="muted small" style="margin-top:4px">'+(s?'Realtime sync connected.':'Share one trip across friends’ phones with roles and invite code.')+'</div>'+
    (secure?'<div class="st90cardstatus"><b>'+esc(s.inviteCode||'Invite')+'</b><span>'+roleLabel(myRole())+' • '+(navigator.onLine?'Live':'Offline')+'</span></div>':(s?'<div class="st90cardstatus"><b>Old Beta Share</b><span>Create new secure Shared Trip</span></div>':''))+
    '<div class="st90grid"><button id="st90main" class="btn primary">'+(secure?'Manage Shared Trip':'Share Current Trip')+'</button><button id="st90how" class="btn soft">'+(secure?'Share Invite':'How It Works')+'</button></div>'+
    '<label class="st90label">Join another Shared Trip</label><div class="st90join"><input id="st90code" placeholder="Enter invite code"><button id="st90join">Join</button></div>';
  set.appendChild(c);
  $('#st90main').onclick=()=>secure?openManage():createShare();$('#st90how').onclick=()=>secure?shareInvite(s.inviteCode):alert('1. Owner opens a trip and taps Share Current Trip.\n2. Invite code/link friend nu send karo.\n3. Friend login karke invite code Join field ch enter kare.\n4. Trip changes realtime sab members te sync honge.');
  $('#st90join').onclick=()=>joinShare($('#st90code').value);$('#st90code').onkeydown=e=>{if(e.key==='Enter')$('#st90join').click()};
}
function refreshCard(){card();if($('#st90shade')){const m=$('#st90members');if(m)m.innerHTML=memberRows()}}
function hookSave(){
  const old=window.save;if(typeof old==='function'&&!old.__st90){const w=function(){const r=old.apply(this,arguments);if(!applying&&trip()?.sharedTrip?.tripId)schedulePush();return r};w.__st90=true;window.save=w}
}
const joinParam=new URLSearchParams(location.search).get('join');if(joinParam)localStorage.setItem(PENDING,joinParam.toUpperCase());
setTimeout(()=>{
  hookSave();card();
  const t=trip(),s=t?.sharedTrip;if(s?.tripId)startWatch(s.tripId);
  const p=localStorage.getItem(PENDING);if(p&&user()&&t){localStorage.removeItem(PENDING);setTimeout(()=>joinShare(p),300)}
},2200);
const oldRS=window.renderSettings;if(typeof oldRS==='function'&&!oldRS.__st90){const w=function(){const r=oldRS.apply(this,arguments);setTimeout(card,0);return r};w.__st90=true;window.renderSettings=w}
window.addEventListener('online',()=>{const t=trip();if(t?.sharedTrip?.tripId){startWatch(t.sharedTrip.tripId);schedulePush()}refreshCard()});
window.addEventListener('offline',refreshCard);
window.tripKhataShareCurrentTrip=createShare;
window.tripKhataJoinSharedTrip=joinShare;
window.tripKhataSharedManage=openManage;
window.tripKhataSharedAudit=showActivity;

const css=document.createElement('style');css.textContent='.st90shade{position:fixed;inset:0;z-index:4400;background:#10244499;display:flex;align-items:flex-end;justify-content:center}.st90modal{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:17px 18px 24px;box-sizing:border-box}.st90top{display:flex;justify-content:space-between}.st90top b,.st90top small{display:block}.st90top b{font-size:21px}.st90top small{color:#7b8797}.st90top button{border:0;background:#eef3f8;border-radius:9px;padding:8px}.st90status{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:14px}.st90status>div,.st90cardstatus{background:#f5f8fc;border-radius:11px;padding:11px;text-align:center}.st90status span,.st90status b,.st90cardstatus b,.st90cardstatus span{display:block}.st90status span,.st90cardstatus span{font-size:10px;color:#788596}.st90status b{font-size:13px;margin-top:3px}.st90cardstatus{margin-top:10px}.st90actions,.st90grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.st90actions button,.st90join button,.st90member button,.st90member select{border:1px solid #d8e2ed;background:#fff;color:#1558b0;border-radius:9px;padding:9px;font-weight:800}.st90member{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid #e9edf2}.st90member b,.st90member small{display:block}.st90member small{color:#7c8797;margin-top:2px}.st90right{text-align:right}.st90right>span{display:block;font-size:10px;color:#66768a;margin-bottom:5px}.st90right select,.st90right button{padding:6px;margin-left:4px;font-size:10px}.danger{width:100%;margin-top:13px;padding:12px;border:0;border-radius:10px;background:#fff0ef;color:#c9322d;font-weight:900}.st90note{margin-top:12px;padding:10px;background:#f4f7fb;border-radius:10px;color:#6f7d90;font-size:10px;line-height:1.45}.st90label{display:block;margin-top:11px;font-size:11px;font-weight:800;color:#64748b}.st90join{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:5px}.st90join input{padding:11px;border:1px solid #d8e2ed;border-radius:10px;text-transform:uppercase}.st90grid{grid-template-columns:1fr 1fr}.st90muted{color:#7d8998;font-size:11px;padding:10px 0}@media(max-width:520px){.st90actions{grid-template-columns:1fr 1fr}.st90member{align-items:flex-start}.st90right select,.st90right button{display:block;margin:4px 0 0 auto}}';document.head.appendChild(css);
})();