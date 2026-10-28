/* TripKhata v1.0.17 — release hardening: dialogs, trip management, duplicate guard */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function dialogTitle(msg){
  const s=String(msg||'').toLowerCase();
  if(/required|enter|select|valid|missing|at least|ghato-ghat/.test(s))return 'Required';
  if(/error|failed|unable|not available|permission/.test(s))return 'Something went wrong';
  if(/success|saved|updated|created|joined|synced/.test(s))return 'Done';
  return 'TripKhata';
}
function tkAlert(message,title){
  document.getElementById('tk117Alert')?.remove();
  const d=document.createElement('div');d.id='tk117Alert';d.className='tk117shade';
  d.innerHTML='<div class="tk117dialog"><div class="tk117icon">i</div><div class="tk117title">'+esc(title||dialogTitle(message))+'</div><div class="tk117msg">'+esc(message)+'</div><button class="tk117primary" id="tk117AlertOk">OK</button></div>';
  document.body.appendChild(d);
  document.getElementById('tk117AlertOk').onclick=()=>d.remove();
  d.onclick=e=>{if(e.target===d)d.remove()};
}
window.tkAlert=tkAlert;
window.alert=function(message){tkAlert(message)};

function tkConfirm(message,title='Please confirm'){
  return new Promise(resolve=>{
    document.getElementById('tk117Confirm')?.remove();
    const d=document.createElement('div');d.id='tk117Confirm';d.className='tk117shade';
    d.innerHTML='<div class="tk117dialog"><div class="tk117warn">!</div><div class="tk117title">'+esc(title)+'</div><div class="tk117msg">'+esc(message)+'</div><div class="tk117grid"><button id="tk117No">Cancel</button><button class="tk117danger" id="tk117Yes">Continue</button></div></div>';
    document.body.appendChild(d);
    const done=v=>{d.remove();resolve(v)};
    document.getElementById('tk117No').onclick=()=>done(false);
    document.getElementById('tk117Yes').onclick=()=>done(true);
    d.onclick=e=>{if(e.target===d)done(false)};
  });
}
window.tkConfirm=tkConfirm;

let creating=false,lastCreateFingerprint='',lastCreateAt=0;
const originalCreateTrip=window.createTrip;
if(typeof originalCreateTrip==='function'){
  window.createTrip=function(){
    if(creating)return;
    const name=(window.mTripName?.value||'').trim();
    const members=(window.mTripMembers?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
    const fp=[name.toLowerCase(),window.mTripDate?.value||'',members.map(x=>x.toLowerCase()).sort().join('|')].join('::');
    const now=Date.now();
    if(fp&&fp===lastCreateFingerprint&&now-lastCreateAt<5000){
      tkAlert('This trip was just created. Please check My Trips before creating it again.','Trip already created');
      return;
    }
    const btn=[...document.querySelectorAll('#modalRoot button')].find(b=>/create trip/i.test(b.textContent||''));
    creating=true;if(btn){btn.disabled=true;btn.textContent='Creating…'}
    try{
      const before=state?.trips?.length||0;
      const r=originalCreateTrip.apply(this,arguments);
      const after=state?.trips?.length||0;
      if(after>before){lastCreateFingerprint=fp;lastCreateAt=now;}
      try{window.renderHome?.();if(state?.active)window.renderTrip?.()}catch(e){}
      return r;
    }finally{
      setTimeout(()=>{creating=false;if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Create Trip'}},700);
    }
  };
}

function tripById(tid){return ((typeof state!=='undefined'&&Array.isArray(state.trips))?state.trips:[]).find(t=>String(t.id)===String(tid))}
function editTrip(tid){
  const t=tripById(tid);if(!t)return tkAlert('Trip not found.','Error');
  const root=document.getElementById('modalRoot');if(!root)return;
  root.innerHTML='<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Edit Trip</div>'+
    '<div class="label">Trip name</div><input id="tk117TripName" value="'+esc(t.name||'')+'">'+
    '<div class="grid2"><div><div class="label">Start date</div><input id="tk117TripDate" type="date" value="'+esc(t.date||'')+'"></div><div><div class="label">Currency</div><select id="tk117TripCurrency">'+['₹','$','€','£'].map(c=>'<option value="'+c+'" '+((t.currency||'₹')===c?'selected':'')+'>'+c+'</option>').join('')+'</select></div></div>'+
    '<div class="label">Members</div><input id="tk117TripMembers" value="'+esc((t.members||[]).join(', '))+'"><div class="muted tiny" style="margin-top:6px">Comma separated. Existing expense members should stay included.</div>'+
    '<button class="btn primary block" style="margin-top:16px" onclick="tk117SaveTrip(\''+String(t.id)+'\')">Save Changes</button>'+
    '<button class="btn danger block" style="margin-top:9px" onclick="tk117AskDeleteTrip(\''+String(t.id)+'\')">Delete Trip</button></div></div>';
}
window.tk117EditTrip=editTrip;
window.tk117SaveTrip=function(tid){
  const t=tripById(tid);if(!t)return;
  const name=document.getElementById('tk117TripName')?.value.trim();
  const members=(document.getElementById('tk117TripMembers')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!name)return tkAlert('Business/Trip name required.','Required');
  if(members.length<2)return tkAlert('At least 2 members are required.','Required');
  t.name=name;t.date=document.getElementById('tk117TripDate')?.value||t.date;t.currency=document.getElementById('tk117TripCurrency')?.value||t.currency;t.members=[...new Set(members)];
  try{activity?.('Trip updated: '+name)}catch(e){}
  save();closeModal();renderHome();if(String(state.active)===String(t.id))renderTrip();toastMsg?.('Trip updated');
};

const pendingDeletes=new Map();
window.tripKhataNativeCredentialResult=function(requestId,ok,message){
  const fn=pendingDeletes.get(String(requestId));pendingDeletes.delete(String(requestId));
  if(ok&&fn)fn();else if(message)tkAlert(message,'Delete cancelled');
};
function finishDelete(tid){
  const t=tripById(tid);if(!t)return;
  state.trips=(state.trips||[]).filter(x=>String(x.id)!==String(tid));
  if(String(state.active)===String(tid))state.active=null;
  try{activity?.('Trip deleted: '+(t.name||''))}catch(e){}
  save();closeModal();renderHome();showPage?.('home');toastMsg?.('Trip deleted');
}
window.tk117AskDeleteTrip=async function(tid){
  const t=tripById(tid);if(!t)return;
  const ok=await tkConfirm('Are you sure you want to delete "'+(t.name||'this trip')+'"? This removes its local trip data from this account.','Delete Trip?');
  if(!ok)return;
  if(window.TripKhataAndroid&&typeof window.TripKhataAndroid.confirmTripDelete==='function'){
    const req='del_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    pendingDeletes.set(req,()=>finishDelete(tid));
    try{window.TripKhataAndroid.confirmTripDelete(req,t.name||'Trip');return}catch(e){pendingDeletes.delete(req)}
  }
  tkAlert('Secure deletion requires the Android app with a phone PIN, pattern or password enabled.','Security required');
};

function addTripActions(){
  document.querySelectorAll('.tripcard').forEach(card=>{
    if(card.querySelector('.tk117TripActions'))return;
    const on=card.getAttribute('onclick')||'';
    const m=on.match(/openTrip\(([^)]+)\)/);if(!m)return;
    const tid=String(m[1]).replace(/['"]/g,'').trim();
    const right=card.lastElementChild||card;
    const box=document.createElement('div');box.className='tk117TripActions';
    box.innerHTML='<button title="Edit trip">Edit</button><button class="danger" title="Delete trip">Delete</button>';
    const [e,d]=box.querySelectorAll('button');
    e.onclick=ev=>{ev.stopPropagation();editTrip(tid)};
    d.onclick=ev=>{ev.stopPropagation();window.tk117AskDeleteTrip(tid)};
    right.appendChild(box);
  });
}
const oldRenderHome=window.renderHome;
if(typeof oldRenderHome==='function'&&!oldRenderHome.__tk117){
  const w=function(){const r=oldRenderHome.apply(this,arguments);setTimeout(addTripActions,0);return r};w.__tk117=true;window.renderHome=w;
}
window.addEventListener('tripkhata-local-change',()=>setTimeout(addTripActions,0));
setTimeout(addTripActions,400);

const css=document.createElement('style');css.textContent=
'.tk117shade{position:fixed;inset:0;z-index:10000;background:#10213f80;display:grid;place-items:center;padding:20px}.tk117dialog{width:min(360px,92vw);background:#fff;border-radius:20px;padding:22px;box-shadow:0 24px 70px #0004;text-align:center}.tk117icon,.tk117warn{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;font-weight:900;font-size:24px}.tk117icon{background:#eaf3ff;color:#1677ff}.tk117warn{background:#fff1ef;color:#d43b34}.tk117title{font-size:20px;font-weight:900;color:#17243a}.tk117msg{font-size:14px;line-height:1.5;color:#627086;margin:9px 0 18px;white-space:pre-wrap}.tk117primary,.tk117grid button{border:0;border-radius:12px;padding:12px 18px;font-weight:900}.tk117primary{width:100%;background:#1677ff;color:#fff}.tk117grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tk117grid button{background:#eef2f7;color:#40506a}.tk117grid .tk117danger{background:#d83b34;color:#fff}.tk117TripActions{display:flex;gap:5px;justify-content:flex-end;margin-top:6px}.tk117TripActions button{border:1px solid #d8e2ef;background:#fff;color:#1558b0;border-radius:8px;padding:4px 7px;font-size:10px;font-weight:800}.tk117TripActions button.danger{color:#c83a35;border-color:#f0d1cf}';
document.head.appendChild(css);
})();