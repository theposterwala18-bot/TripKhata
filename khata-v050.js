/* TripKhata v0.5.0 — Independent Customer & Supplier Khata modules */
(function(){
  const KEY='tripkhata_khatabook_v1';
  const KBV='0.5.0';
  let kb=JSON.parse(localStorage.getItem(KEY)||'null')||{customers:[],suppliers:[],profile:{name:state?.user?.name||'My Khata'}};
  function ksave(){localStorage.setItem(KEY,JSON.stringify(kb))}
  function kid(){return Date.now()+Math.floor(Math.random()*10000)}
  function money(n){return '₹'+(Math.round((Number(n)||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}
  function escK(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function fmtDate(d){return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})+' • '+new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
  function entityBal(x,type){
    let b=0;
    (x.entries||[]).forEach(e=>{
      if(type==='customer') b += e.kind==='got'?Number(e.amount):-Number(e.amount);
      else b += e.kind==='purchase'?Number(e.amount):-Number(e.amount);
    });
    return Math.round(b*100)/100;
  }
  function totals(type){
    const list=type==='customer'?kb.customers:kb.suppliers;
    if(type==='customer'){
      let get=0,give=0;list.forEach(x=>{const b=entityBal(x,type);if(b>0)get+=b;else give+=-b});return{a:get,b:give};
    }else{
      let give=0;list.forEach(x=>{const b=entityBal(x,type);if(b>0)give+=b});return{a:give,b:0};
    }
  }
  function contactSupported(){return !!(navigator.contacts&&navigator.contacts.select)}
  async function pickContact(cb){
    if(!contactSupported()){alert('Is browser vich direct Contacts access supported nahi. Android Chrome/APK vich available hovega. Filhal manually name/phone add karo.');return}
    try{
      const c=await navigator.contacts.select(['name','tel'],{multiple:false});
      if(c?.[0])cb({name:c[0].name?.[0]||'',phone:c[0].tel?.[0]||''});
    }catch(e){}
  }
  function host(){
    let h=document.getElementById('kbHost');if(!h){h=document.createElement('div');h.id='kbHost';document.body.appendChild(h)}return h;
  }
  function closeKB(){host().innerHTML=''}
  window.closeKhataBook=closeKB;

  function shell(type,inner){
    const isC=type==='customer';
    host().innerHTML=`<div style="position:fixed;inset:0;z-index:500;background:#f3f6f9;overflow:auto;font-family:Inter,system-ui,-apple-system,sans-serif">
      <div style="position:sticky;top:0;z-index:5;background:#1558b0;color:#fff;padding:18px 16px 14px">
        <div style="display:flex;align-items:center;gap:10px"><button onclick="closeKhataBook()" style="border:0;background:transparent;color:#fff;font-size:28px">←</button><div style="flex:1"><div style="font-size:20px;font-weight:850">${escK(kb.profile.name||'My Khata')}</div><div style="font-size:11px;opacity:.85">Khata Book • v${KBV}</div></div><button onclick="kbOpenMain('customer')" style="border:0;background:transparent;color:#fff;font-size:21px">👥</button></div>
        <div style="display:flex;gap:22px;margin-top:18px"><button onclick="kbOpenMain('customer')" style="border:0;background:transparent;color:#fff;font-size:16px;padding:0 2px 8px;border-bottom:${isC?'4px solid white':'4px solid transparent'}">Customers</button><button onclick="kbOpenMain('supplier')" style="border:0;background:transparent;color:#fff;font-size:16px;padding:0 2px 8px;border-bottom:${!isC?'4px solid white':'4px solid transparent'}">Suppliers</button></div>
      </div>${inner}</div>`;
  }

  window.kbOpenMain=function(type='customer'){
    const list=type==='customer'?kb.customers:kb.suppliers,t=totals(type),isC=type==='customer';
    shell(type,`<div style="padding:14px 14px 90px">
      <div style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
        ${isC?`<div style="display:grid;grid-template-columns:1fr 1fr;padding:18px 10px;text-align:center"><div style="border-right:1px solid #eee"><div style="color:#777">You will give</div><div style="font-size:23px;font-weight:850;color:#34834b;margin-top:4px">${money(t.b)}</div></div><div><div style="color:#777">You will get</div><div style="font-size:23px;font-weight:850;color:#c13a3a;margin-top:4px">${money(t.a)}</div></div></div>`
        :`<div style="padding:20px"><div style="font-size:16px">Total purchase / payable</div><div style="font-size:28px;font-weight:900;margin-top:7px">${money(t.a)}</div></div>`}
        <div style="display:grid;grid-template-columns:1fr 1fr;background:#f6f7f9"><button onclick="kbGlobalReport('${type}')" style="padding:15px;border:0;background:transparent;color:#1558b0;font-weight:800">📄 VIEW REPORT</button><button onclick="kbShareGlobal('${type}')" style="padding:15px;border:0;background:transparent;color:#1558b0;font-weight:800">↗ SHARE</button></div>
      </div>
      <div style="display:flex;gap:10px;margin:14px 0"><div style="flex:1;background:white;border-radius:15px;padding:11px 14px;display:flex;align-items:center;gap:8px"><span>🔍</span><input id="kbSearch" placeholder="Search ${isC?'Customer':'Supplier'}" oninput="kbFilterList('${type}')" style="border:0;outline:0;width:100%;font-size:16px"></div><button onclick="kbGlobalReport('${type}')" style="border:0;background:#fff;border-radius:14px;padding:0 15px;font-size:22px;color:#1558b0">PDF</button></div>
      <div id="kbList">${renderList(type,list)}</div>
      <button onclick="kbAddEntity('${type}')" style="position:fixed;right:22px;bottom:26px;border:0;border-radius:28px;padding:15px 20px;background:${isC?'#a71d50':'#378a50'};color:white;font-size:17px;font-weight:850;box-shadow:0 8px 22px rgba(0,0,0,.2)">＋ ${isC?'Add Customer':'Add Supplier'}</button>
    </div>`);
  };
  function renderList(type,list){
    return list.map(x=>{const b=entityBal(x,type),isC=type==='customer';return `<div onclick="kbOpenLedger('${type}',${x.id})" style="background:#fff;border-bottom:1px solid #e7e7e7;padding:14px 10px;display:flex;gap:12px;align-items:center">
      <div style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:${isC?'#3778d0':'#348c55'};color:white;font-weight:800">${escK((x.name||'?').split(/\s+/).map(a=>a[0]).join('').slice(0,2).toUpperCase())}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escK(x.name)}</div><div style="color:#999;font-size:13px">${x.phone?escK(x.phone):'No phone'} • ${x.entries?.length||0} entries</div></div>
      <div style="text-align:right;font-weight:850;color:${b===0?'#1558b0':(isC?(b>0?'#c33':'#388a4d'):(b>0?'#388a4d':'#c33'))}">${money(Math.abs(b))}<div style="font-size:12px;font-weight:500;color:#999">${isC?(b>0?"You'll Get":b<0?"You'll Give":'Clear'):(b>0?"You'll Give":b<0?"Advance":'Clear')}</div></div>
    </div>`}).join('')||'<div style="padding:30px;text-align:center;color:#888">No records yet.</div>';
  }
  window.kbFilterList=function(type){
    const q=(document.getElementById('kbSearch')?.value||'').toLowerCase(),list=(type==='customer'?kb.customers:kb.suppliers).filter(x=>x.name.toLowerCase().includes(q)||(x.phone||'').includes(q));document.getElementById('kbList').innerHTML=renderList(type,list);
  };

  window.kbAddEntity=function(type){
    const isC=type==='customer';
    shell(type,`<div style="padding:16px"><div style="background:white;border-radius:18px;padding:18px">
      <div style="font-size:22px;font-weight:900">Add ${isC?'Customer':'Supplier'}</div>
      <button id="pickContactBtn" onclick="kbPickIntoForm()" style="width:100%;margin-top:14px;padding:13px;border:1px solid #cdd8e7;border-radius:13px;background:#edf5ff;color:#1558b0;font-weight:800">📱 Add from Phone Contacts</button>
      <div style="margin-top:12px;color:#777;font-size:12px">${contactSupported()?'Contacts supported on this device':'Browser contacts access may not be supported; manual entry always works.'}</div>
      <div style="margin-top:14px">Name</div><input id="kbName" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px;margin-top:6px" placeholder="Name">
      <div style="margin-top:12px">Phone Number</div><input id="kbPhone" inputmode="tel" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px;margin-top:6px" placeholder="+91...">
      <button onclick="kbSaveEntity('${type}')" style="width:100%;margin-top:18px;padding:14px;border:0;border-radius:13px;background:${isC?'#1558b0':'#378a50'};color:white;font-weight:850">Save</button>
    </div></div>`);
    window._kbCurrentType=type;
  };
  window.kbPickIntoForm=function(){pickContact(c=>{kbName.value=c.name;kbPhone.value=c.phone})};
  window.kbSaveEntity=function(type){
    const name=kbName.value.trim(),phone=kbPhone.value.trim();if(!name)return alert('Name enter karo.');
    const list=type==='customer'?kb.customers:kb.suppliers;if(list.some(x=>x.name.toLowerCase()===name.toLowerCase()&&(x.phone||'')===phone))return alert('Eh record already exists.');
    list.unshift({id:kid(),name,phone,entries:[],createdAt:new Date().toISOString()});ksave();kbOpenMain(type);
  };

  window.kbOpenLedger=function(type,eid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);if(!x)return;const b=entityBal(x,type),isC=type==='customer';
    shell(type,`<div style="padding:14px 14px 100px">
      <div style="background:#fff;border-radius:18px;padding:15px;display:flex;gap:12px;align-items:center"><div style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#1480ee;color:white;font-size:21px">${escK(x.name.split(/\s+/).map(a=>a[0]).join('').slice(0,2).toUpperCase())}</div><div style="flex:1"><div style="font-size:20px;font-weight:850">${escK(x.name)}</div><div style="color:#777">${escK(x.phone||'No phone')}</div></div><button onclick="kbEditEntity('${type}',${eid})" style="border:0;background:#f0f5fb;border-radius:11px;padding:10px">⋮</button></div>
      <div style="background:#fff;border-radius:18px;margin-top:12px;padding:17px"><div style="display:flex;justify-content:space-between"><b>${isC?(b>=0?'You will get':'You will give'):(b>=0?'You will give':'Advance paid')}</b><b style="font-size:20px;color:${b>=0?'#c43a3a':'#3a8c50'}">${money(Math.abs(b))}</b></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0"><button onclick="kbEntityReport('${type}',${eid})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">📄 Report</button><button onclick="kbShareEntity('${type}',${eid})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">↗ Share</button><button onclick="kbCall(${JSON.stringify(x.phone||'')})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">☎ Call</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;font-size:12px;color:#999;padding:7px 10px"><div>ENTRIES</div><div style="text-align:center">${isC?'YOU GAVE':'PURCHASE'}</div><div style="text-align:right">${isC?'YOU GOT':'PAYMENT'}</div></div>
      <div>${renderEntries(type,x)}</div>
      <div style="position:fixed;left:0;right:0;bottom:0;background:white;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;box-shadow:0 -6px 20px rgba(0,0,0,.08)">
        <button onclick="kbAddEntry('${type}',${eid},'${isC?'gave':'purchase'}')" style="padding:15px;border:0;border-radius:13px;background:${isC?'#c73732':'#078d49'};color:white;font-weight:900">${isC?'YOU GAVE ₹':'PURCHASE'}</button>
        <button onclick="kbAddEntry('${type}',${eid},'${isC?'got':'payment'}')" style="padding:15px;border:0;border-radius:13px;background:${isC?'#078d49':'#c73732'};color:white;font-weight:900">${isC?'YOU GOT ₹':'PAYMENT'}</button>
      </div>
    </div>`);
  };
  function renderEntries(type,x){
    if(!(x.entries||[]).length)return'<div style="padding:50px 10px;text-align:center;color:#888">No entries yet.</div>';
    let running=0;return [...x.entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{
      const isC=type==='customer';if(isC)running+=e.kind==='got'?Number(e.amount):-Number(e.amount);else running+=e.kind==='purchase'?Number(e.amount):-Number(e.amount);
      const left=(isC&&e.kind==='gave')||(!isC&&e.kind==='purchase'),right=!left;
      return `<div onclick="kbEntryDetails('${type}',${x.id},${e.id})" style="background:#fff;border-radius:12px;margin-bottom:10px;padding:13px;display:grid;grid-template-columns:1.5fr .75fr .75fr;align-items:center"><div><div style="color:#999;font-size:12px">${fmtDate(e.date)}</div><div style="font-weight:700;margin-top:5px">${escK(e.note||'')}</div></div><div style="text-align:center;color:${left?'#2d8c49':'#c33'};font-weight:850">${left?money(e.amount):''}</div><div style="text-align:right;color:${right?'#c33':'#2d8c49'};font-weight:850">${right?money(e.amount):''}</div></div>`;
    }).join('');
  }
  window.kbCall=function(phone){if(phone)location.href='tel:'+phone;else alert('Phone number not added.')};

  window.kbAddEntry=function(type,eid,kind){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);if(!x)return;const green=(type==='supplier'&&kind==='purchase')||(type==='customer'&&kind==='got');
    shell(type,`<div style="padding:16px"><div style="font-size:21px;font-weight:900;text-align:center;color:${green?'#378a50':'#c13a3a'}">${type==='customer'?(kind==='gave'?'You Gave':'You Got'):(kind==='purchase'?'Purchase from':'Payment to')} ${escK(x.name)}</div>
      <div style="background:#fff;border-radius:15px;padding:16px;margin-top:18px"><input id="keAmount" type="number" inputmode="decimal" placeholder="₹ 0" style="width:100%;font-size:28px;font-weight:850;padding:14px;border:1px solid #ddd;border-radius:12px">
      <textarea id="keNote" placeholder="Details / note" style="width:100%;min-height:90px;margin-top:12px;padding:13px;border:1px solid #ddd;border-radius:12px"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><input id="keDate" type="date" value="${new Date().toISOString().slice(0,10)}" style="padding:13px;border:1px solid #ddd;border-radius:12px"><label style="padding:13px;border:1px solid #ddd;border-radius:12px;text-align:center">📷 Attach bill<input id="kePhoto" type="file" accept="image/*" capture="environment" style="display:none"></label></div>
      <button onclick="kbSaveEntry('${type}',${eid},'${kind}')" style="width:100%;padding:15px;border:0;border-radius:13px;background:${green?'#378a50':'#c13a3a'};color:#fff;font-weight:900;margin-top:18px">Save</button></div></div>`);
  };
  window.kbSaveEntry=function(type,eid,kind){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),a=Number(keAmount.value);if(!a)return alert('Valid amount enter karo.');
    const file=kePhoto.files?.[0];const done=photo=>{x.entries.push({id:kid(),kind,amount:+a.toFixed(2),note:keNote.value.trim(),date:new Date(keDate.value||Date.now()).toISOString(),photo:photo||null});ksave();kbOpenLedger(type,eid)};
    if(file){const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(file)}else done(null);
  };

  window.kbEntryDetails=function(type,eid,enid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),e=x?.entries.find(z=>z.id===enid);if(!e)return;
    shell(type,`<div style="padding:16px"><div style="background:#fff;border-radius:18px;padding:18px"><div style="font-size:20px;font-weight:900">Entry Details</div><div style="display:flex;justify-content:space-between;margin-top:18px"><b>${escK(x.name)}</b><b>${money(e.amount)}</b></div><div style="color:#888;margin-top:6px">${fmtDate(e.date)}</div><hr style="border:0;border-top:1px solid #eee;margin:18px 0"><div style="color:#888">Details</div><div style="font-size:18px;margin-top:6px">${escK(e.note||'No details')}</div>${e.photo?`<img src="${e.photo}" style="max-width:100%;border-radius:12px;margin-top:14px">`:''}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px"><button onclick="kbDeleteEntry('${type}',${eid},${enid})" style="padding:13px;border:1px solid #d33;border-radius:12px;background:#fff;color:#d33">Delete</button><button onclick="kbShareEntity('${type}',${eid})" style="padding:13px;border:0;border-radius:12px;background:#1558b0;color:#fff">Share</button></div></div></div>`);
  };
  window.kbDeleteEntry=function(type,eid,enid){if(!confirm('Delete this entry?'))return;const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);x.entries=x.entries.filter(e=>e.id!==enid);ksave();kbOpenLedger(type,eid)};

  function reportText(type,x){
    const b=entityBal(x,type),isC=type==='customer';let s=`*${x.name} — ${isC?'Customer':'Supplier'} Khata*\n${x.phone?'Phone: '+x.phone+'\n':''}\n`;
    s+=`Current Balance: ${money(Math.abs(b))} ${isC?(b>0?'You will get':b<0?'You will give':'Clear'):(b>0?'You will give':b<0?'Advance':'Clear')}\n\n*Entries*\n`;
    (x.entries||[]).forEach(e=>s+=`• ${fmtDate(e.date)} — ${e.note||''} — ${money(e.amount)} — ${e.kind}\n`);return s+'\nGenerated by TripKhata Khata Book';
  }
  window.kbShareEntity=function(type,eid){const x=(type==='customer'?kb.customers:kb.suppliers).find(z=>z.id===eid),text=reportText(type,x);if(navigator.share)navigator.share({title:x.name+' Khata',text}).catch(()=>{});else{navigator.clipboard?.writeText(text);alert('Report copied')}}
  window.kbEntityReport=function(type,eid){
    const x=(type==='customer'?kb.customers:kb.suppliers).find(z=>z.id===eid),b=entityBal(x,type),w=window.open('','_blank');w.document.write(`<!doctype html><title>${escK(x.name)} Khata</title><style>body{font-family:Arial;max-width:800px;margin:30px auto;padding:0 20px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}@media print{button{display:none}}</style><h1>${escK(x.name)} Khata Report</h1><p>${escK(x.phone||'')}</p><h2>Balance: ${money(Math.abs(b))}</h2><table><tr><th>Date</th><th>Details</th><th>Type</th><th>Amount</th></tr>${(x.entries||[]).map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${escK(e.note||'')}</td><td>${escK(e.kind)}</td><td>${money(e.amount)}</td></tr>`).join('')}</table><button onclick="print()">Print / Save PDF</button>`);w.document.close();
  };
  window.kbGlobalReport=function(type){
    const list=type==='customer'?kb.customers:kb.suppliers,w=window.open('','_blank'),isC=type==='customer',t=totals(type);w.document.write(`<!doctype html><title>Khata Report</title><style>body{font-family:Arial;max-width:900px;margin:30px auto;padding:0 20px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border:1px solid #ccc;text-align:left}@media print{button{display:none}}</style><h1>${isC?'Customer':'Supplier'} List Report</h1><p>As of ${new Date().toLocaleDateString()}</p>${isC?`<p>You'll Get: <b>${money(t.a)}</b> &nbsp; You'll Give: <b>${money(t.b)}</b></p>`:`<p>Total Payable: <b>${money(t.a)}</b></p>`}<table><tr><th>Name</th><th>Phone</th><th>Balance</th><th>Status</th></tr>${list.map(x=>{const b=entityBal(x,type);return`<tr><td>${escK(x.name)}</td><td>${escK(x.phone||'')}</td><td>${money(Math.abs(b))}</td><td>${isC?(b>0?'You will get':b<0?'You will give':'Clear'):(b>0?'You will give':b<0?'Advance':'Clear')}</td></tr>`}).join('')}</table><p><button onclick="print()">Print / Save PDF</button></p>`);w.document.close();
  };
  window.kbShareGlobal=function(type){
    const list=type==='customer'?kb.customers:kb.suppliers,isC=type==='customer',t=totals(type);let s=`*${isC?'Customer':'Supplier'} Khata Summary*\n`;if(isC)s+=`You'll Get: ${money(t.a)}\nYou'll Give: ${money(t.b)}\n\n`;else s+=`Total Payable: ${money(t.a)}\n\n`;list.forEach(x=>{const b=entityBal(x,type);s+=`• ${x.name}: ${money(Math.abs(b))} ${isC?(b>0?'GET':b<0?'GIVE':'CLEAR'):(b>0?'PAY':'CLEAR')}\n`});if(navigator.share)navigator.share({title:'Khata Summary',text:s}).catch(()=>{});else{navigator.clipboard?.writeText(s);alert('Summary copied')}}
  window.kbEditEntity=function(type,eid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);if(!x)return;
    shell(type,`<div style="padding:16px"><div style="background:#fff;border-radius:18px;padding:18px"><div style="font-size:21px;font-weight:900">Edit ${type==='customer'?'Customer':'Supplier'}</div><div style="margin-top:14px">Name</div><input id="kbName" value="${escK(x.name)}" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px"><div style="margin-top:12px">Phone</div><input id="kbPhone" value="${escK(x.phone||'')}" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px"><button onclick="kbUpdateEntity('${type}',${eid})" style="width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:#1558b0;color:#fff;font-weight:850">Save Changes</button><button onclick="kbDeleteEntity('${type}',${eid})" style="width:100%;margin-top:9px;padding:14px;border:1px solid #d33;border-radius:12px;background:#fff;color:#d33;font-weight:800">Delete ${type==='customer'?'Customer':'Supplier'}</button></div></div>`);
  };
  window.kbUpdateEntity=function(type,eid){const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);x.name=kbName.value.trim();x.phone=kbPhone.value.trim();ksave();kbOpenLedger(type,eid)};
  window.kbDeleteEntity=function(type,eid){if(!confirm('Delete entire khata and all entries?'))return;const key=type==='customer'?'customers':'suppliers';kb[key]=kb[key].filter(x=>x.id!==eid);ksave();kbOpenMain(type)};

  function addLauncher(){
    if(document.getElementById('kbLauncher'))return;
    const top=document.querySelector('.topbar');if(top){const b=document.createElement('button');b.id='kbLauncher';b.className='iconbtn';b.textContent='📒';b.title='Customer / Supplier Khata';b.onclick=()=>kbOpenMain('customer');const prof=[...top.querySelectorAll('button')].pop();prof?top.insertBefore(b,prof):top.appendChild(b)}
    const set=document.getElementById('page-settings');if(set&&!document.getElementById('kbSettingsCard')){const c=document.createElement('div');c.id='kbSettingsCard';c.className='card';c.innerHTML='<div class="cardtitle">Khata Book Modules</div><div class="muted small" style="margin-top:3px">Independent from TripKhata</div><div class="grid2" style="margin-top:12px"><button class="btn primary" onclick="kbOpenMain(\'customer\')">👥 Customers</button><button class="btn soft" onclick="kbOpenMain(\'supplier\')">📦 Suppliers</button></div>';set.appendChild(c)}
  }
  const oldSettings=window.renderSettings;window.renderSettings=function(){oldSettings();setTimeout(addLauncher,0)};
  setInterval(addLauncher,1000);setTimeout(addLauncher,200);
})();