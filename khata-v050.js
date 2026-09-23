/* TripKhata v0.5.0 — Independent Customer & Supplier Khata modules */
(function(){
  const KEY='tripkhata_khatabook_v1';
  const KBV=window.TRIPKHATA_VERSION||'0.5.2';
  let kb=JSON.parse(localStorage.getItem(KEY)||'null')||{customers:[],suppliers:[],profile:{name:state?.user?.name||'My Khata'}};
  kb.profile=kb.profile||{};if(!kb.profile.lang)kb.profile.lang='en';
  function ksave(){localStorage.setItem(KEY,JSON.stringify(kb))}
  function kid(){return Date.now()+Math.floor(Math.random()*10000)}
  function money(n){return '₹'+(Math.round((Number(n)||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}
  function escK(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function fmtDate(d){return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})+' • '+new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
  function isPa(){return kb.profile?.lang==='pa'}
  function tx(k){
    const pa={
      customerKhata:'ਕਸਟਮਰ ਖਾਤਾ',suppliers:'ਸਪਲਾਇਰ',youWillGive:'ਤੁਹਾਨੂੰ ਦੇਣੇ ਹਨ',youWillGet:'ਤੁਹਾਨੂੰ ਲੈਣੇ ਹਨ',
      report:'ਰਿਪੋਰਟ',share:'ਸ਼ੇਅਰ',call:'ਕਾਲ',entries:'ਐਂਟਰੀਆਂ',youGave:'ਤੁਸੀਂ ਦਿੱਤੇ',youGot:'ਤੁਸੀਂ ਪ੍ਰਾਪਤ ਕੀਤੇ',
      owes:'ਗਾਹਕ ਨੇ ਤੁਹਾਨੂੰ ਦੇਣੇ ਹਨ',paid:'ਗਾਹਕ ਨੇ ਤੁਹਾਨੂੰ ਭੁਗਤਾਨ ਕੀਤਾ',totalDebit:'ਕੁੱਲ ਡੈਬਿਟ',totalCredit:'ਕੁੱਲ ਕ੍ਰੈਡਿਟ',
      netBalance:'ਕੁੱਲ ਬਕਾਇਆ',addCustomer:'ਕਸਟਮਰ ਜੋੜੋ',searchCustomer:'ਕਸਟਮਰ ਖੋਜੋ',entryDetails:'ਐਂਟਰੀ ਵੇਰਵਾ',
      details:'ਵੇਰਵਾ',delete:'ਡਿਲੀਟ',edit:'ਸੋਧੋ',saveChanges:'ਬਦਲਾਅ ਸੇਵ ਕਰੋ',type:'ਕਿਸਮ',amount:'ਰਕਮ',date:'ਤਾਰੀਖ',
      customerOwes:'ਗਾਹਕ ਨੇ ਤੁਹਾਨੂੰ ਦੇਣੇ ਹਨ',customerPaid:'ਗਾਹਕ ਨੇ ਤੁਹਾਨੂੰ ਭੁਗਤਾਨ ਕੀਤਾ',language:'ਭਾਸ਼ਾ'
    };
    const en={
      customerKhata:'Customer Khata',suppliers:'Suppliers',youWillGive:'You will give',youWillGet:'You will get',
      report:'Report',share:'Share',call:'Call',entries:'Entries',youGave:'You Gave',youGot:'You Got',
      owes:'Customer owes you',paid:'Customer paid you',totalDebit:'Total Debit',totalCredit:'Total Credit',
      netBalance:'Net Balance',addCustomer:'Add Customer',searchCustomer:'Search Customer',entryDetails:'Entry Details',
      details:'Details',delete:'Delete',edit:'Edit',saveChanges:'Save Changes',type:'Type',amount:'Amount',date:'Date',
      customerOwes:'Customer owes you',customerPaid:'Customer paid you',language:'Language'
    };
    return (isPa()?pa:en)[k]||k;
  }
  function entryCreatedMs(e){
    if(e.createdAt){const n=Date.parse(e.createdAt);if(Number.isFinite(n))return n}
    const idn=Number(e.id);if(Number.isFinite(idn)&&idn>1000000000000)return idn;
    const dn=Date.parse(e.date);return Number.isFinite(dn)?dn:0;
  }
  function entryDayKey(e){
    const d=new Date(e.date||entryCreatedMs(e)||Date.now());
    return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  }
  function entrySort(a,b){
    const day=entryDayKey(b)-entryDayKey(a);if(day)return day;
    return entryCreatedMs(b)-entryCreatedMs(a);
  }
  function displayEntryDate(e){
    const d=new Date(e.date||Date.now()),t=new Date(entryCreatedMs(e)||d);
    const ds=d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'});
    const ts=t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return ds+' • '+ts;
  }
  function customerEntryTotals(x){
    let debit=0,credit=0;(x.entries||[]).forEach(e=>{if(e.kind==='gave')debit+=Number(e.amount)||0;else if(e.kind==='got')credit+=Number(e.amount)||0});
    return {debit:Math.round(debit*100)/100,credit:Math.round(credit*100)/100,balance:Math.round((debit-credit)*100)/100};
  }
  window.kbLangReturn=null;
  window.kbToggleLang=function(){kb.profile.lang=isPa()?'en':'pa';ksave();if(typeof window.kbLangReturn==='function')window.kbLangReturn()};
  function entityBal(x,type){
    let b=0;
    (x.entries||[]).forEach(e=>{
      if(type==='customer') b += e.kind==='gave'?Number(e.amount):-Number(e.amount);
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
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="closeKhataBook()" style="border:0;background:transparent;color:#fff;font-size:28px">←</button>
          <div style="flex:1">
            <div style="font-size:20px;font-weight:850">${isC?tx('customerKhata'):tx('suppliers')}</div>
            <div style="font-size:11px;opacity:.85">${escK(kb.profile.name||'My Khata')} • v${KBV}</div>
          </div><button onclick="kbToggleLang()" style="border:1px solid #ffffff66;background:#ffffff18;color:#fff;border-radius:10px;padding:7px 9px;font-size:12px;font-weight:800">${isPa()?'EN':'ਪੰ'}</button>
        </div>
      </div>${inner}</div>`;
  }

  window.kbOpenMain=function(type='customer'){
    window.kbLangReturn=()=>kbOpenMain(type);
    const list=type==='customer'?kb.customers:kb.suppliers,t=totals(type),isC=type==='customer';
    shell(type,`<div style="padding:14px 14px 90px">
      <div style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
        ${isC?`<div style="display:grid;grid-template-columns:1fr 1fr;padding:18px 10px;text-align:center"><div style="border-right:1px solid #eee"><div style="color:#777">${tx('youWillGive')}</div><div style="font-size:23px;font-weight:850;color:#34834b;margin-top:4px">${money(t.b)}</div></div><div><div style="color:#777">${tx('youWillGet')}</div><div style="font-size:23px;font-weight:850;color:#c13a3a;margin-top:4px">${money(t.a)}</div></div></div>`
        :`<div style="padding:20px"><div style="font-size:16px">Total purchase / payable</div><div style="font-size:28px;font-weight:900;margin-top:7px">${money(t.a)}</div></div>`}
        <div style="display:grid;grid-template-columns:1fr 1fr;background:#f6f7f9"><button onclick="kbGlobalReport('${type}')" style="padding:15px;border:0;background:transparent;color:#1558b0;font-weight:800">📄 ${isPa()?'ਰਿਪੋਰਟ':'VIEW REPORT'}</button><button onclick="kbShareGlobal('${type}')" style="padding:15px;border:0;background:transparent;color:#1558b0;font-weight:800">↗ ${isPa()?'ਸ਼ੇਅਰ':'SHARE'}</button></div>
      </div>
      <div style="display:flex;gap:10px;margin:14px 0"><div style="flex:1;background:white;border-radius:15px;padding:11px 14px;display:flex;align-items:center;gap:8px"><span>🔍</span><input id="kbSearch" placeholder="${isC?tx('searchCustomer'):'Search Supplier'}" oninput="kbFilterList('${type}')" style="border:0;outline:0;width:100%;font-size:16px"></div><button onclick="kbGlobalReport('${type}')" style="border:0;background:#fff;border-radius:14px;padding:0 15px;font-size:22px;color:#1558b0">PDF</button></div>
      <div id="kbList">${renderList(type,list)}</div>
      <button onclick="kbAddEntity('${type}')" style="position:fixed;right:22px;bottom:26px;border:0;border-radius:28px;padding:15px 20px;background:${isC?'#a71d50':'#378a50'};color:white;font-size:17px;font-weight:850;box-shadow:0 8px 22px rgba(0,0,0,.2)">＋ ${isC?tx('addCustomer'):'Add Supplier'}</button>
    </div>`);
  };
  function renderList(type,list){
    return list.map(x=>{const b=entityBal(x,type),isC=type==='customer';return `<div onclick="kbOpenLedger('${type}',${x.id})" style="background:#fff;border-bottom:1px solid #e7e7e7;padding:14px 10px;display:flex;gap:12px;align-items:center">
      <div style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:${isC?'#3778d0':'#348c55'};color:white;font-weight:800">${escK((x.name||'?').split(/\s+/).map(a=>a[0]).join('').slice(0,2).toUpperCase())}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escK(x.name)}</div><div style="color:#999;font-size:13px">${x.phone?escK(x.phone):'No phone'} • ${x.entries?.length||0} entries</div></div>
      <div style="text-align:right;font-weight:850;color:${b===0?'#1558b0':(isC?(b>0?'#c33':'#388a4d'):(b>0?'#388a4d':'#c33'))}">${money(Math.abs(b))}<div style="font-size:12px;font-weight:500;color:#999">${isC?(b>0?tx('youWillGet'):b<0?tx('youWillGive'):(isPa()?'ਕਲੀਅਰ':'Clear')):(b>0?"You'll Give":b<0?"Advance":'Clear')}</div></div>
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
    window.kbLangReturn=()=>kbOpenLedger(type,eid);
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);if(!x)return;const b=entityBal(x,type),isC=type==='customer';
    shell(type,`<div style="padding:14px 14px 100px">
      <div style="background:#fff;border-radius:18px;padding:15px;display:flex;gap:12px;align-items:center"><div style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#1480ee;color:white;font-size:21px">${escK(x.name.split(/\s+/).map(a=>a[0]).join('').slice(0,2).toUpperCase())}</div><div style="flex:1"><div style="font-size:20px;font-weight:850">${escK(x.name)}</div><div style="color:#777">${escK(x.phone||'No phone')}</div></div><button onclick="kbEditEntity('${type}',${eid})" style="border:0;background:#f0f5fb;border-radius:11px;padding:10px">⋮</button></div>
      <div style="background:#fff;border-radius:18px;margin-top:12px;padding:17px"><div style="display:flex;justify-content:space-between"><b>${isC?(b>=0?tx('youWillGet'):tx('youWillGive')):(b>=0?'You will give':'Advance paid')}</b><b style="font-size:20px;color:${b>=0?'#c43a3a':'#3a8c50'}">${money(Math.abs(b))}</b></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0"><button onclick="kbEntityReport('${type}',${eid})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">📄 ${tx('report')}</button><button onclick="kbShareEntity('${type}',${eid})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">↗ ${tx('share')}</button><button onclick="kbCall(${JSON.stringify(x.phone||'')})" style="padding:12px;border:0;background:#fff;border-radius:13px;color:#1558b0">☎ ${tx('call')}</button></div>
      ${isC?`<div style="background:#eef5ff;border-radius:12px;padding:10px 12px;margin:10px 0;font-size:12px;color:#456"><b>${tx('youGave')}</b> = ${tx('owes')} • <b>${tx('youGot')}</b> = ${tx('paid')}</div>`:''}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;font-size:12px;color:#999;padding:7px 10px"><div>${isC?tx('entries'):'ENTRIES'}</div><div style="text-align:center">${isC?tx('youGave'):'PURCHASE'}</div><div style="text-align:right">${isC?tx('youGot'):'PAYMENT'}</div></div>
      <div>${renderEntries(type,x)}</div>
      ${isC?(()=>{const z=customerEntryTotals(x);return `<div style="background:#fff;border-radius:16px;margin-top:12px;padding:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center"><div><div style="font-size:11px;color:#888">${tx('totalDebit')}</div><b style="color:#c33">${money(z.debit)}</b></div><div><div style="font-size:11px;color:#888">${tx('totalCredit')}</div><b style="color:#2d8c49">${money(z.credit)}</b></div><div><div style="font-size:11px;color:#888">${tx('netBalance')}</div><b style="color:#1558b0">${money(Math.abs(z.balance))}</b></div></div>`})():''}
      <div style="position:fixed;left:0;right:0;bottom:0;background:white;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;box-shadow:0 -6px 20px rgba(0,0,0,.08)">
        <button onclick="kbAddEntry('${type}',${eid},'${isC?'gave':'purchase'}')" style="padding:15px;border:0;border-radius:13px;background:${isC?'#c73732':'#078d49'};color:white;font-weight:900">${isC?tx('youGave')+' ₹<div style="font-size:10px;font-weight:600;opacity:.9">'+tx('customerOwes')+'</div>':'PURCHASE'}</button>
        <button onclick="kbAddEntry('${type}',${eid},'${isC?'got':'payment'}')" style="padding:15px;border:0;border-radius:13px;background:${isC?'#078d49':'#c73732'};color:white;font-weight:900">${isC?tx('youGot')+' ₹<div style="font-size:10px;font-weight:600;opacity:.9">'+tx('customerPaid')+'</div>':'PAYMENT'}</button>
      </div>
    </div>`);
  };
  function renderEntries(type,x){
    if(!(x.entries||[]).length)return'<div style="padding:50px 10px;text-align:center;color:#888">No entries yet.</div>';
    let running=0;return [...x.entries].sort(entrySort).map(e=>{
      const isC=type==='customer';if(isC)running+=e.kind==='gave'?Number(e.amount):-Number(e.amount);else running+=e.kind==='purchase'?Number(e.amount):-Number(e.amount);
      const left=(isC&&e.kind==='gave')||(!isC&&e.kind==='purchase'),right=!left;
      return `<div onclick="kbEntryDetails('${type}',${x.id},${e.id})" style="background:#fff;border-radius:12px;margin-bottom:10px;padding:13px;display:grid;grid-template-columns:1.5fr .75fr .75fr;align-items:center"><div><div style="color:#999;font-size:12px">${displayEntryDate(e)}</div><div style="font-weight:700;margin-top:5px">${escK(e.note||'')}</div></div><div style="text-align:center;color:${isC?'#c33':'#2d8c49'};font-weight:850">${left?money(e.amount):''}</div><div style="text-align:right;color:${isC?'#2d8c49':'#c33'};font-weight:850">${right?money(e.amount):''}</div></div>`;
    }).join('');
  }
  window.kbCall=function(phone){if(phone)location.href='tel:'+phone;else alert('Phone number not added.')};

  window.kbAddEntry=function(type,eid,kind){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid);if(!x)return;const green=(type==='supplier'&&kind==='purchase')||(type==='customer'&&kind==='got');
    shell(type,`<div style="padding:16px"><div style="font-size:21px;font-weight:900;text-align:center;color:${green?'#378a50':'#c13a3a'}">${type==='customer'?(kind==='gave'?tx('youGave'):tx('youGot')):(kind==='purchase'?'Purchase from':'Payment to')} ${escK(x.name)}</div>
      <div style="background:#fff;border-radius:15px;padding:16px;margin-top:18px"><input id="keAmount" type="number" inputmode="decimal" placeholder="₹ 0" style="width:100%;font-size:28px;font-weight:850;padding:14px;border:1px solid #ddd;border-radius:12px">
      <textarea id="keNote" placeholder="Details / note" style="width:100%;min-height:90px;margin-top:12px;padding:13px;border:1px solid #ddd;border-radius:12px"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><input id="keDate" type="date" value="${new Date().toISOString().slice(0,10)}" style="padding:13px;border:1px solid #ddd;border-radius:12px"><label style="padding:13px;border:1px solid #ddd;border-radius:12px;text-align:center">📷 Attach bill<input id="kePhoto" type="file" accept="image/*" capture="environment" style="display:none"></label></div>
      <button onclick="kbSaveEntry('${type}',${eid},'${kind}')" style="width:100%;padding:15px;border:0;border-radius:13px;background:${green?'#378a50':'#c13a3a'};color:#fff;font-weight:900;margin-top:18px">Save</button></div></div>`);
  };
  window.kbSaveEntry=function(type,eid,kind){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),a=Number(keAmount.value);if(!a)return alert('Valid amount enter karo.');
    const file=kePhoto.files?.[0];const done=photo=>{const now=new Date(),sel=keDate.value?new Date(keDate.value+'T00:00:00'):new Date();sel.setHours(now.getHours(),now.getMinutes(),now.getSeconds(),now.getMilliseconds());x.entries.push({id:kid(),kind,amount:+a.toFixed(2),note:keNote.value.trim(),date:sel.toISOString(),createdAt:now.toISOString(),photo:photo||null});ksave();kbOpenLedger(type,eid)};
    if(file){const r=new FileReader();r.onload=()=>done(r.result);r.readAsDataURL(file)}else done(null);
  };

  window.kbEntryDetails=function(type,eid,enid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),e=x?.entries.find(z=>z.id===enid);if(!e)return;
    shell(type,`<div style="padding:16px"><div style="background:#fff;border-radius:18px;padding:18px"><div style="font-size:20px;font-weight:900">${tx('entryDetails')}</div><div style="display:flex;justify-content:space-between;margin-top:18px"><b>${escK(x.name)}</b><b>${money(e.amount)}</b></div><div style="color:#888;margin-top:6px">${displayEntryDate(e)}</div><hr style="border:0;border-top:1px solid #eee;margin:18px 0"><div style="color:#888">${tx('details')}</div><div style="font-size:18px;margin-top:6px">${escK(e.note||'No details')}</div>${e.photo?`<img src="${e.photo}" style="max-width:100%;border-radius:12px;margin-top:14px">`:''}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:20px"><button onclick="kbDeleteEntry('${type}',${eid},${enid})" style="padding:13px;border:1px solid #d33;border-radius:12px;background:#fff;color:#d33">${tx('delete')}</button><button onclick="kbEditEntry('${type}',${eid},${enid})" style="padding:13px;border:1px solid #1558b0;border-radius:12px;background:#eef5ff;color:#1558b0">${tx('edit')}</button><button onclick="kbShareEntity('${type}',${eid})" style="padding:13px;border:0;border-radius:12px;background:#1558b0;color:#fff">${tx('share')}</button></div></div></div>`);
  };
  window.kbEditEntry=function(type,eid,enid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),e=x?.entries.find(z=>z.id===enid);if(!e)return;
    const isC=type==='customer';
    shell(type,`<div style="padding:16px"><div style="background:#fff;border-radius:18px;padding:18px"><div style="font-size:20px;font-weight:900">${isPa()?'ਐਂਟਰੀ ਸੋਧੋ':'Edit Entry'}</div>
      <div style="margin-top:14px;color:#777">${tx('type')}</div>
      <select id="keEditKind" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px">
        ${isC?`<option value="gave" ${e.kind==='gave'?'selected':''}>You Gave — Customer owes you</option><option value="got" ${e.kind==='got'?'selected':''}>You Got — Customer paid you</option>`:`<option value="purchase" ${e.kind==='purchase'?'selected':''}>Purchase</option><option value="payment" ${e.kind==='payment'?'selected':''}>Payment</option>`}
      </select>
      <div style="margin-top:12px;color:#777">${tx('amount')}</div><input id="keEditAmount" type="number" inputmode="decimal" value="${e.amount}" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:12px">
      <div style="margin-top:12px;color:#777">${tx('details')}</div><textarea id="keEditNote" style="width:100%;box-sizing:border-box;min-height:90px;padding:13px;border:1px solid #ddd;border-radius:12px">${escK(e.note||'')}</textarea>
      <div style="margin-top:12px;color:#777">${tx('date')}</div><input id="keEditDate" type="date" value="${new Date(e.date).toISOString().slice(0,10)}" style="width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:12px">
      <button onclick="kbSaveEditedEntry('${type}',${eid},${enid})" style="width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:#1558b0;color:#fff;font-weight:850">${tx('saveChanges')}</button>
    </div></div>`);
  };
  window.kbSaveEditedEntry=function(type,eid,enid){
    const list=type==='customer'?kb.customers:kb.suppliers,x=list.find(z=>z.id===eid),e=x?.entries.find(z=>z.id===enid);if(!e)return;
    const a=Number(keEditAmount.value);if(!a)return alert('Valid amount enter karo.');
    e.kind=keEditKind.value;e.amount=+a.toFixed(2);e.note=keEditNote.value.trim();const oldT=new Date(entryCreatedMs(e)||Date.now()),sel=new Date((keEditDate.value||new Date(e.date).toISOString().slice(0,10))+'T00:00:00');sel.setHours(oldT.getHours(),oldT.getMinutes(),oldT.getSeconds(),oldT.getMilliseconds());e.date=sel.toISOString();if(!e.createdAt)e.createdAt=oldT.toISOString();
    ksave();kbEntryDetails(type,eid,enid);
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
    shell(type,`<div style="padding:16px"><div style="background:#fff;border-radius:18px;padding:18px"><div style="font-size:21px;font-weight:900">Edit ${type==='customer'?'Customer':'Supplier'}</div><div style="margin-top:14px">Name</div><input id="kbName" value="${escK(x.name)}" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px"><div style="margin-top:12px">Phone</div><input id="kbPhone" value="${escK(x.phone||'')}" style="width:100%;padding:13px;border:1px solid #ddd;border-radius:12px"><button onclick="kbUpdateEntity('${type}',${eid})" style="width:100%;margin-top:16px;padding:14px;border:0;border-radius:12px;background:#1558b0;color:#fff;font-weight:850">Save Changes</button><button onclick="kbTransferEntity('${type}',${eid})" style="width:100%;margin-top:9px;padding:14px;border:1px solid #1558b0;border-radius:12px;background:#eef5ff;color:#1558b0;font-weight:850">${type==='customer'?'Move / Copy to Suppliers':'Move / Copy to Customer Khata'}</button><button onclick="kbDeleteEntity('${type}',${eid})" style="width:100%;margin-top:9px;padding:14px;border:1px solid #d33;border-radius:12px;background:#fff;color:#d33;font-weight:800">Delete ${type==='customer'?'Customer':'Supplier'}</button></div></div>`);
  };
  window.kbTransferEntity=function(type,eid){
    const src=type==='customer'?kb.customers:kb.suppliers;
    const dst=type==='customer'?kb.suppliers:kb.customers;
    const x=src.find(z=>z.id===eid);if(!x)return;
    const targetLabel=type==='customer'?'Supplier':'Customer';
    const exists=dst.find(z=>(z.phone&&x.phone&&z.phone===x.phone)||z.name.toLowerCase()===x.name.toLowerCase());
    if(exists){alert(targetLabel+' already exists.');return}
    const bal=entityBal(x,type);
    if(Math.abs(bal)<0.005){
      if(confirm('Balance clear hai. '+x.name+' nu '+targetLabel+' vich MOVE karna? Old ledger remove ho ju, contact safe transfer hovega.')){
        dst.unshift({id:kid(),name:x.name,phone:x.phone||'',entries:[],createdAt:new Date().toISOString(),movedFrom:type});
        const key=type==='customer'?'customers':'suppliers';
        kb[key]=kb[key].filter(z=>z.id!==eid);
        ksave();kbOpenMain(type==='customer'?'supplier':'customer');
      }
    }else{
      if(confirm('Is khate da pending balance '+money(Math.abs(bal))+' hai. History mix karna safe nahi. Contact nu '+targetLabel+' vich COPY karna te old ledger preserve rakhna?')){
        dst.unshift({id:kid(),name:x.name,phone:x.phone||'',entries:[],createdAt:new Date().toISOString(),copiedFrom:type});
        ksave();kbOpenMain(type==='customer'?'supplier':'customer');
      }
    }
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