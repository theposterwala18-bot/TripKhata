/* TripKhata v0.8.0 — support/feedback + owner-only dashboard */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const OWNER=()=>String(window.TRIPKHATA_OWNER_EMAIL||'').toLowerCase();
const SUPPORT=()=>window.TRIPKHATA_SUPPORT_EMAIL||window.TRIPKHATA_OWNER_EMAIL||'';
const isOwner=()=>String(window.TK_AUTH?.currentUser?.email||'').toLowerCase()===OWNER();

function shade(html){
  $('#tk80Modal')?.remove();
  const d=document.createElement('div');d.id='tk80Modal';d.className='tk80shade';d.innerHTML='<div class="tk80sheet">'+html+'</div>';
  document.body.appendChild(d);d.onclick=e=>{if(e.target===d)d.remove()};return d;
}
function close(){ $('#tk80Modal')?.remove() }

function support(kind){
  const title=kind==='feedback'?'Feedback / Suggestion':'Contact Support';
  const d=shade('<div class="tk80top"><div><b>'+title+'</b><small>TripKhata</small></div><button id="tk80close">✕</button></div>'+
    '<label>Category<select id="tk80cat"><option>General</option><option>Bug / Problem</option><option>Suggestion</option><option>Account / Login</option><option>Backup / Restore</option><option>Trip Sync</option></select></label>'+
    '<label>Message<textarea id="tk80msg" placeholder="Write details here..."></textarea></label>'+
    '<div class="tk80grid"><button id="tk80copy">Copy Details</button><button class="primary" id="tk80mail">Open Email App</button></div>'+
    '<button class="tk80block" id="tk80save">Save Feedback in Cloud</button>'+
    '<div class="tk80hint">Support: '+esc(SUPPORT())+'</div>');
  $('#tk80close').onclick=close;
  const body=()=>('TripKhata '+title+'\nCategory: '+$('#tk80cat').value+'\nUser: '+(window.TK_AUTH?.currentUser?.email||'Not signed in')+'\nVersion: '+(window.TRIPKHATA_VERSION||'')+'\n\n'+$('#tk80msg').value.trim());
  $('#tk80copy').onclick=async()=>{try{await navigator.clipboard.writeText(SUPPORT()+'\n\n'+body());alert('Copied.')}catch(e){alert(body())}};
  $('#tk80mail').onclick=()=>{const subject=encodeURIComponent('TripKhata '+title);const b=encodeURIComponent(body());location.href='mailto:'+encodeURIComponent(SUPPORT())+'?subject='+subject+'&body='+b};
  $('#tk80save').onclick=async()=>{
    const u=window.TK_AUTH?.currentUser;if(!u)return alert('Cloud feedback save karan layi login karo.');
    if(!window.firebase?.firestore)return alert('Cloud not ready.');
    const msg=$('#tk80msg').value.trim();if(!msg)return alert('Message enter karo.');
    try{
      await firebase.firestore().collection('users').doc(u.uid).collection('feedback').add({
        type:kind,category:$('#tk80cat').value,message:msg,email:u.email||'',version:window.TRIPKHATA_VERSION||'',createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('Feedback saved.');close();
    }catch(e){alert('Save error: '+e.message)}
  };
}

function counts(){
  let trips=0,customers=0,suppliers=0;
  try{trips=(typeof state!=='undefined'&&Array.isArray(state.trips))?state.trips.length:0}catch(e){}
  try{const k=JSON.parse(localStorage.getItem('tripkhata_khatabook_v1')||'{}');customers=(k.customers||[]).length;suppliers=(k.supplierBusiness?.parties||k.suppliers||[]).length}catch(e){}
  return {trips,customers,suppliers};
}
function ownerDashboard(){
  if(!isOwner())return alert('Owner access only.');
  const c=counts(),u=window.TK_AUTH?.currentUser;
  const d=shade('<div class="tk80top"><div><b>Owner Dashboard</b><small>Visible only to owner account</small></div><button id="tk80close">✕</button></div>'+
    '<div class="tk80stats"><div><span>Trips</span><b>'+c.trips+'</b></div><div><span>Customers</span><b>'+c.customers+'</b></div><div><span>Supplier Parties</span><b>'+c.suppliers+'</b></div></div>'+
    '<div class="tk80card"><b>Owner Account</b><div>'+esc(u?.email||'')+'</div><small>App v'+esc(window.TRIPKHATA_VERSION||'')+' • '+(navigator.onLine?'Online':'Offline')+'</small></div>'+
    '<div class="tk80grid"><button id="tk80sync">Force Sync</button><button id="tk80backup">Cloud Backup</button><button id="tk80drive">Drive Backup</button><button id="tk80info">Copy App Info</button></div>'+
    '<div class="tk80hint">Future owner controls: user management, feature flags, broadcast notices, feedback analytics.</div>');
  $('#tk80close').onclick=close;
  $('#tk80sync').onclick=()=>window.tripKhataSyncNow?.();
  $('#tk80backup').onclick=()=>window.tripKhataBackupNow?.().then(()=>alert('Cloud backup complete.')).catch(e=>alert(e.message));
  $('#tk80drive').onclick=()=>window.tripKhataDriveBackupNow?.().then(()=>alert('Drive backup complete.')).catch(e=>alert(e.message));
  $('#tk80info').onclick=async()=>{const s='TripKhata v'+(window.TRIPKHATA_VERSION||'')+' | '+location.href+' | '+(window.TRIPKHATA_CLOUD?.status||'unknown');try{await navigator.clipboard.writeText(s);alert('Copied.')}catch(e){alert(s)}};
}

function patchMailLinks(){
  document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{
    const h=a.getAttribute('href')||'',t=(a.textContent||'').toLowerCase();
    if(/feedback|suggestion/i.test(h)||t.includes('feedback')){a.href='#';a.onclick=e=>{e.preventDefault();support('feedback')}}
    else if(/support/i.test(h)||t.includes('contact')){a.href='#';a.onclick=e=>{e.preventDefault();support('contact')}}
  });
}
function patchSettings(){
  const set=$('#page-settings');if(!set)return;
  let card=$('#tk80SupportCard');
  if(!card){
    card=document.createElement('div');card.id='tk80SupportCard';card.className='card';
    card.innerHTML='<div class="cardtitle">Support & Account</div><div class="muted small" style="margin-top:4px">Contact/feedback without relying only on a mail link.</div>'+
      '<div class="tk80settings"><button id="tk80contact">✉ Contact</button><button id="tk80feedback">💬 Feedback</button></div>'+
      (isOwner()?'<button id="tk80owner" class="tk80ownerbtn">👑 Owner Dashboard</button>':'');
    set.appendChild(card);
  }
  $('#tk80contact')&&($('#tk80contact').onclick=()=>support('contact'));
  $('#tk80feedback')&&($('#tk80feedback').onclick=()=>support('feedback'));
  $('#tk80owner')&&($('#tk80owner').onclick=ownerDashboard);
  patchMailLinks();
}

window.tripKhataContact=()=>support('contact');
window.tripKhataFeedback=()=>support('feedback');
window.tripKhataOwnerDashboard=ownerDashboard;

const st=document.createElement('style');
st.textContent='.tk80shade{position:fixed;inset:0;z-index:4200;background:#10244499;display:flex;align-items:flex-end;justify-content:center}.tk80sheet{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:17px 18px 24px;box-sizing:border-box}.tk80top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.tk80top b,.tk80top small{display:block}.tk80top b{font-size:21px}.tk80top small{color:#7a8798}.tk80top button{border:0;background:#eef3f8;border-radius:9px;padding:8px}.tk80sheet label{display:block;margin-top:13px;font-size:12px;font-weight:800;color:#607087}.tk80sheet select,.tk80sheet textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:11px;border:1px solid #d9e2ed;border-radius:10px;font:inherit}.tk80sheet textarea{min-height:110px}.tk80grid,.tk80settings{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.tk80grid button,.tk80settings button,.tk80block,.tk80ownerbtn{border:1px solid #dbe4ef;background:#fff;color:#1558b0;border-radius:10px;padding:11px;font-weight:850}.tk80grid .primary{background:#1558b0;color:#fff;border-color:#1558b0}.tk80block,.tk80ownerbtn{width:100%;margin-top:9px}.tk80ownerbtn{background:#fff8e6;color:#7b5b00;border-color:#f1dfad}.tk80hint{font-size:10px;color:#8793a2;margin-top:10px;line-height:1.45}.tk80stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.tk80stats>div{background:#f5f8fc;border-radius:12px;padding:12px;text-align:center}.tk80stats span,.tk80stats b{display:block}.tk80stats span{font-size:10px;color:#7a8797}.tk80stats b{font-size:20px;margin-top:3px}.tk80card{margin-top:12px;background:#f8fafc;border:1px solid #e3e9f1;border-radius:12px;padding:12px}.tk80card small{display:block;color:#8490a0;margin-top:5px}';
document.head.appendChild(st);
setTimeout(()=>{patchSettings();patchMailLinks()},1400);
const old=window.renderSettings;if(typeof old==='function'&&!old.__tk80){const w=function(){const r=old.apply(this,arguments);setTimeout(patchSettings,0);return r};w.__tk80=true;window.renderSettings=w}
})();