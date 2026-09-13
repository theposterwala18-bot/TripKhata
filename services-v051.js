/* TripKhata v0.5.2 — Services module tabs */
(function(){
  const V='0.5.2';

  function ensureServiceBar(){
    const app=document.getElementById('app');
    if(!app || document.getElementById('tkServiceBar')) return;
    const top=document.querySelector('.topbar');
    if(!top) return;

    const bar=document.createElement('div');
    bar.id='tkServiceBar';
    bar.style.cssText='position:sticky;top:70px;z-index:19;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-bottom:1px solid #e7eef7;padding:10px 12px 12px;box-shadow:0 5px 14px rgba(31,64,108,.04)';
    bar.innerHTML=`
      <div style="font-size:11px;font-weight:850;color:#7386a8;margin:0 2px 8px">SERVICES</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <button id="svcTrip" onclick="kbSwitchService('trip')" style="border:1px solid #dce7f5;border-radius:14px;padding:10px 7px;background:#1677ff;color:#fff;font-weight:850;min-width:0">
          <div style="font-size:17px">🧳</div><div style="font-size:12px;margin-top:3px">Trip Khata</div>
        </button>
        <button id="svcCustomer" onclick="kbSwitchService('customer')" style="border:1px solid #dce7f5;border-radius:14px;padding:10px 7px;background:#fff;color:#17345f;font-weight:850;min-width:0">
          <div style="font-size:17px">👥</div><div style="font-size:12px;margin-top:3px">Customer Khata</div>
        </button>
        <button id="svcSupplier" onclick="kbSwitchService('supplier')" style="border:1px solid #dce7f5;border-radius:14px;padding:10px 7px;background:#fff;color:#17345f;font-weight:850;min-width:0">
          <div style="font-size:17px">📦</div><div style="font-size:12px;margin-top:3px">Suppliers</div>
        </button>
      </div>`;
    top.insertAdjacentElement('afterend',bar);
    setActiveService('trip');
  }

  function setActiveService(which){
    const ids={trip:'svcTrip',customer:'svcCustomer',supplier:'svcSupplier'};
    Object.entries(ids).forEach(([k,id])=>{
      const b=document.getElementById(id); if(!b)return;
      const on=k===which;
      b.style.background=on?'#1677ff':'#fff';
      b.style.color=on?'#fff':'#17345f';
      b.style.boxShadow=on?'0 6px 14px rgba(22,119,255,.18)':'none';
    });
  }
  window.kbSetActiveService=setActiveService;

  window.kbSwitchService=function(which){
    if(which==='trip'){
      document.getElementById('kbHost')?.replaceChildren();
      setActiveService('trip');
      if(typeof goNav==='function')goNav('home');
      return;
    }
    if(which==='customer'){
      setActiveService('customer');
      if(typeof kbOpenMain==='function')kbOpenMain('customer');
      return;
    }
    setActiveService('supplier');
    if(typeof kbOpenMain==='function')kbOpenMain('supplier');
  };

  // Keep active state synced when Khata modules are opened
  const oldKbOpenMain=window.kbOpenMain;
  if(oldKbOpenMain){
    window.kbOpenMain=function(type='customer'){
      oldKbOpenMain(type);
      setActiveService(type==='supplier'?'supplier':'customer');
    };
  }

  const oldClose=window.closeKhataBook;
  if(oldClose){
    window.closeKhataBook=function(){
      oldClose();
      setActiveService('trip');
    };
  }

  // Remove old icon-only Khata launcher from header; services bar replaces it.
  function cleanupOldLauncher(){
    document.getElementById('kbLauncher')?.remove();
  }

  const oldAll=window.renderAll;
  window.renderAll=function(){
    oldAll();
    setTimeout(()=>{ensureServiceBar();cleanupOldLauncher()},0);
  };
  const oldTrip=window.renderTrip;
  window.renderTrip=function(){
    oldTrip();
    setTimeout(()=>{ensureServiceBar();cleanupOldLauncher();setActiveService('trip')},0);
  };

  setInterval(()=>{ensureServiceBar();cleanupOldLauncher()},1000);

  const s=document.createElement('style');
  s.textContent=`
    @media(max-width:390px){
      #tkServiceBar{padding-left:8px!important;padding-right:8px!important}
      #tkServiceBar button{padding:9px 4px!important}
      #tkServiceBar button div:last-child{font-size:11px!important}
    }`;
  document.head.appendChild(s);
})();