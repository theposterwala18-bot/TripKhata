/* TripKhata v0.8.2 — Connected Khata Beta (isolated; no ledger mutation) */
(function(){
'use strict';
const KEY='tripkhata_khatabook_v1';
const LINK_KEY='tripkhata_connected_khata_v082';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function root(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}}
function supplier(){return root().supplierBusiness||{businesses:[],parties:[],entries:[]}}
function delta(e){const a=Number(e.amount)||0;if(e.type==='purchase'||e.type==='payment_received'||e.type==='opening_payable')return a;if(e.type==='sale'||e.type==='payment_made'||e.type==='opening_receivable')return -a;return 0}
function bal(d,pid){return (d.entries||[]).filter(e=>e.partyId===pid).reduce((s,e)=>s+delta(e),0)}
function party(pid){const d=supplier();return {d,p:(d.parties||[]).find(x=>Number(x.id)===Number(pid))}}
function links(){try{return JSON.parse(localStorage.getItem(LINK_KEY)||'{}')||{}}catch(e){return {}}}
function saveLinks(x){localStorage.setItem(LINK_KEY,JSON.stringify(x))}
function db(){return window.firebase?.firestore?firebase.firestore():null}
function user(){return window.TK_AUTH?.currentUser||null}
function code(){return 'CK'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase()}
function cloudErr(e){if(e?.code==='permission-denied')return 'Connected Khata cloud permission haje enable nahi. Beta data safe hai; normal Supplier Khata te koi asar nahi.';return e?.message||String(e)}
function shade(html){
  $('#ck82')?.remove();
  const d=document.createElement('div');d.id='ck82';d.className='ck82shade';d.innerHTML='<div class="ck82sheet">'+html+'</div>';
  document.body.appendChild(d);d.onclick=e=>{if(e.target===d)d.remove()};return d;
}
function close(){ $('#ck82')?.remove() }

async function createRequest(pid){
  const u=user(),x=party(pid),p=x.p,d=x.d;if(!p)return alert('Party not found.');
  if(!u)return alert('Connected Khata layi pehla login karo.');
  if(!db())return alert('Cloud not ready.');
  const b=bal(d,pid),id=code();
  try{
    await db().collection('connectedKhataRequests').doc(id).set({
      code:id,status:'pending',
      requester:{uid:u.uid,email:u.email||'',name:u.displayName||'',partyId:Number(pid),partyName:p.name||'',partyPhone:p.phone||'',balance:b},
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdAtClient:Date.now()
    });
    const l=links();l[pid]={code:id,status:'pending',createdAt:Date.now()};saveLinks(l);
    const link=location.origin+location.pathname+'?ck='+encodeURIComponent(id);
    const txt='TripKhata Connected Khata request\nCode: '+id+'\n'+link;
    try{if(navigator.share)await navigator.share({title:'Connected Khata',text:txt,url:link});else await navigator.clipboard.writeText(txt)}catch(e){try{await navigator.clipboard.writeText(txt)}catch(_){}}
    openParty(pid);
  }catch(e){alert(cloudErr(e))}
}

async function refreshStatus(pid){
  const l=links(),rec=l[pid];if(!rec?.code||!db())return null;
  try{
    const s=await db().collection('connectedKhataRequests').doc(rec.code).get();
    if(!s.exists)return null;
    const z=s.data()||{};rec.status=z.status||rec.status;rec.remote=z.acceptor||null;l[pid]=rec;saveLinks(l);return z;
  }catch(e){return null}
}

function localPartiesOptions(){
  const d=supplier();
  return (d.parties||[]).map(p=>'<option value="'+p.id+'">'+esc(p.name)+' • '+esc(p.phone||'No phone')+'</option>').join('');
}

async function acceptCode(id){
  id=String(id||'').trim().toUpperCase();
  const u=user();if(!u)return alert('Join karan layi login karo.');
  if(!id)return alert('Connection code enter karo.');
  if(!db())return alert('Cloud not ready.');
  try{
    const ref=db().collection('connectedKhataRequests').doc(id),s=await ref.get();
    if(!s.exists)return alert('Connection code not found.');
    const z=s.data()||{};if(z.status==='connected')return alert('Eh request already connected hai.');
    const opts=localPartiesOptions();if(!opts)return alert('Pehla Supplier module ch opposite party add karo.');
    const d=shade('<div class="ck82top"><div><b>Accept Connected Khata</b><small>'+esc(z.requester?.partyName||'Party')+'</small></div><button id="ck82x">✕</button></div>'+
      '<div class="ck82safe">Normal Supplier Khata safe rahega. Accept karan nal koi Purchase/Sale/Payment auto-create nahi hovega.</div>'+
      '<label>Your local party for this relationship<select id="ck82local">'+opts+'</select></label>'+
      '<button class="ck82primary" id="ck82accept">Accept Connection</button>');
    $('#ck82x').onclick=close;
    $('#ck82accept').onclick=async()=>{
      const pid=Number($('#ck82local').value),x=party(pid);if(!x.p)return;
      const b=bal(x.d,pid);
      try{
        await ref.set({status:'connected',acceptor:{uid:u.uid,email:u.email||'',name:u.displayName||'',partyId:pid,partyName:x.p.name||'',partyPhone:x.p.phone||'',balance:b},connectedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        const l=links();l[pid]={code:id,status:'connected',role:'acceptor',createdAt:Date.now()};saveLinks(l);
        alert('Connected Khata linked. Automatic ledger changes OFF ne.');
        close();
      }catch(e){alert(cloudErr(e))}
    };
  }catch(e){alert(cloudErr(e))}
}

async function compare(pid){
  const l=links(),rec=l[pid];if(!rec?.code)return alert('Party haje connected nahi.');
  const u=user(),x=party(pid);if(!u||!x.p||!db())return;
  try{
    const ref=db().collection('connectedKhataRequests').doc(rec.code),s=await ref.get();if(!s.exists)return alert('Connection not found.');
    let z=s.data()||{},local=bal(x.d,pid);
    if(z.requester?.uid===u.uid)await ref.update({'requester.balance':local});
    else if(z.acceptor?.uid===u.uid)await ref.update({'acceptor.balance':local});
  }catch(e){console.warn('Connected Khata balance refresh',e)}
  try{
    const s=await db().collection('connectedKhataRequests').doc(rec.code).get(),z=s.data()||{};
    const a=Number(z.requester?.balance||0),b=Number(z.acceptor?.balance||0);
    const counterpart=(z.requester?.uid===u.uid?z.acceptor:z.requester)||{};
    const same=Math.abs(Math.abs(a)-Math.abs(b))<0.01;
    shade('<div class="ck82top"><div><b>Balance Compare</b><small>'+esc(x.p.name)+'</small></div><button id="ck82x">✕</button></div>'+
      '<div class="ck82compare"><div><span>Your Balance</span><b>'+money(Math.abs(local))+'</b></div><div><span>Other Side</span><b>'+money(Math.abs(Number(counterpart.balance||0)))+'</b></div></div>'+
      '<div class="'+(same?'ck82ok':'ck82warn')+'">'+(same?'✓ Balance amount matched':'⚠ Difference: '+money(Math.abs(Math.abs(local)-Math.abs(Number(counterpart.balance||0)))))+'</div>'+
      '<div class="ck82safe">Eh comparison sirf snapshot check hai. Existing ledger entries change nahi hundian.</div>');
    $('#ck82x').onclick=close;
  }catch(e){alert(cloudErr(e))}
}

async function openParty(pid){
  const x=party(pid),p=x.p,d=x.d;if(!p)return;
  const b=bal(d,pid),l=links(),rec=l[pid]||{};
  if(rec.code)await refreshStatus(pid);
  const r=links()[pid]||rec,status=r.status||'not_connected';
  const d0=shade('<div class="ck82top"><div><b>Connected Khata <em>BETA</em></b><small>'+esc(p.name)+' • '+esc(p.phone||'No phone')+'</small></div><button id="ck82x">✕</button></div>'+
    '<div class="ck82safe"><b>Safe Mode:</b> Normal Supplier ledger primary aa. Connected Khata koi old/new transaction automatically edit, delete ja create nahi karega.</div>'+
    '<div class="ck82balance"><span>Your Current Balance</span><b>'+money(Math.abs(b))+'</b><small>'+(b>0?'You Have To Pay':b<0?'You Have To Receive':'Account Clear')+'</small></div>'+
    '<div class="ck82status"><span>Status</span><b>'+esc(status.replace('_',' ').toUpperCase())+'</b>'+(r.code?'<small>Code: '+esc(r.code)+'</small>':'')+'</div>'+
    (status==='connected'
      ?'<button class="ck82primary" id="ck82compare">Compare Balance</button><button class="ck82ghost" id="ck82share">Share Connection Code</button>'
      :status==='pending'
      ?'<button class="ck82ghost" id="ck82refresh">Refresh Connection Status</button><button class="ck82ghost" id="ck82share">Share Request Again</button>'
      :'<button class="ck82primary" id="ck82create">Create Connection Request</button>')+
    '<div class="ck82note"><b>Phone Match later:</b> Same verified mobile number milan te “TripKhata User Found” suggestion future secure-directory phase ch aayegi. Hune privacy layi automatic phone lookup OFF aa.</div>');
  $('#ck82x').onclick=close;
  $('#ck82create')&&($('#ck82create').onclick=()=>createRequest(pid));
  $('#ck82refresh')&&($('#ck82refresh').onclick=async()=>{await refreshStatus(pid);openParty(pid)});
  $('#ck82compare')&&($('#ck82compare').onclick=()=>compare(pid));
  $('#ck82share')&&($('#ck82share').onclick=async()=>{const rr=links()[pid];if(!rr?.code)return;const link=location.origin+location.pathname+'?ck='+rr.code,txt='TripKhata Connected Khata\nCode: '+rr.code+'\n'+link;try{if(navigator.share)await navigator.share({title:'Connected Khata',text:txt,url:link});else await navigator.clipboard.writeText(txt)}catch(e){}});
}

function settingsCard(){
  const set=$('#page-settings');if(!set||$('#ck82card'))return;
  const c=document.createElement('div');c.id='ck82card';c.className='card';
  c.innerHTML='<div class="cardtitle">🔗 Connected Khata (Beta)</div><div class="muted small" style="margin-top:4px">Optional party-to-party balance connection. Existing Supplier Khata stays unchanged.</div>'+
    '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px"><input id="ck82code" placeholder="Enter connection code" style="padding:11px;border:1px solid #d8e2ee;border-radius:10px;text-transform:uppercase"><button id="ck82join" class="btn soft">Connect</button></div>'+
    '<div class="muted tiny" style="margin-top:7px">Connection code duje TripKhata user ton milega. Accept karan time tusi apni local party choose karoge.</div>';
  set.appendChild(c);$('#ck82join').onclick=()=>acceptCode($('#ck82code').value);
}
window.tripKhataConnectedParty=openParty;
window.tripKhataAcceptConnectedCode=acceptCode;
const q=new URLSearchParams(location.search).get('ck');if(q)localStorage.setItem('tripkhata_pending_ck',q.toUpperCase());
setTimeout(()=>{settingsCard();const pending=localStorage.getItem('tripkhata_pending_ck');if(pending&&user()){localStorage.removeItem('tripkhata_pending_ck');acceptCode(pending)}},1900);
const old=window.renderSettings;if(typeof old==='function'&&!old.__ck82){const w=function(){const r=old.apply(this,arguments);setTimeout(settingsCard,0);return r};w.__ck82=true;window.renderSettings=w}
const st=document.createElement('style');st.textContent='.ck82shade{position:fixed;inset:0;z-index:4300;background:#10244499;display:flex;align-items:flex-end;justify-content:center}.ck82sheet{width:min(560px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:17px 18px 24px;box-sizing:border-box}.ck82top{display:flex;justify-content:space-between;gap:10px}.ck82top b,.ck82top small{display:block}.ck82top b{font-size:20px}.ck82top em{font-style:normal;font-size:9px;background:#fff1c2;color:#806000;padding:3px 5px;border-radius:6px}.ck82top small{color:#7b8797;margin-top:3px}.ck82top button{border:0;background:#eef3f8;border-radius:9px;padding:8px}.ck82safe,.ck82note{margin-top:12px;padding:11px;border-radius:11px;background:#f4f8fd;color:#607086;font-size:11px;line-height:1.45}.ck82balance{text-align:center;padding:22px 10px}.ck82balance span,.ck82balance b,.ck82balance small{display:block}.ck82balance b{font-size:27px;margin:5px}.ck82balance small{color:#7b8797}.ck82status{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px;background:#f8fafc;border-radius:11px}.ck82status span,.ck82status small{font-size:10px;color:#7c8794}.ck82status b{font-size:12px}.ck82primary,.ck82ghost{width:100%;margin-top:10px;padding:12px;border-radius:10px;font-weight:900}.ck82primary{border:0;background:#1558b0;color:#fff}.ck82ghost{border:1px solid #d8e2ed;background:#fff;color:#1558b0}.ck82sheet label{display:block;margin-top:12px;font-size:12px;font-weight:800;color:#64748b}.ck82sheet select{width:100%;margin-top:6px;padding:11px;border:1px solid #d8e2ed;border-radius:10px}.ck82compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.ck82compare>div{text-align:center;background:#f6f8fb;border-radius:12px;padding:15px}.ck82compare span,.ck82compare b{display:block}.ck82compare span{font-size:10px;color:#7b8797}.ck82compare b{font-size:20px;margin-top:4px}.ck82ok,.ck82warn{margin-top:12px;padding:12px;border-radius:11px;text-align:center;font-weight:900}.ck82ok{background:#eaf8ef;color:#16834d}.ck82warn{background:#fff4e8;color:#aa6717}';document.head.appendChild(st);
})();