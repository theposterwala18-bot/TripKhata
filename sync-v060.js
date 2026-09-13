/* TripKhata v0.6.0 — Firestore private account sync */
(function(){
  let db=null,off=null,timer=null,last='',device=localStorage.getItem('tripkhata_device_id');
  if(!device){device='d_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);localStorage.setItem('tripkhata_device_id',device)}

  function loadFirestore(){
    if(window.firebase&&firebase.firestore)return Promise.resolve();
    return new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js';s.onload=ok;s.onerror=fail;document.head.appendChild(s)});
  }
  function cleanData(x){try{return JSON.parse(JSON.stringify(x,(k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/'))return null;if(typeof v==='string'&&v.length>200000)return null;return v}))}catch(e){return x}}
  function snap(){
    let trip=null;try{if(typeof state!=='undefined')trip=cleanData(state)}catch(e){}
    const local={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&/tripkhata|khata/i.test(k)&&k!=='tripkhata_device_id'){
        let v=localStorage.getItem(k);if(v!=null&&v.length<2000000){if(k==='tripkhata_khatabook_v1'){try{v=JSON.stringify(cleanData(JSON.parse(v)))}catch(e){}}local[k]=v;}
      }
    }
    return {tripState:trip,local};
  }
  function sig(x){try{return JSON.stringify(x)}catch(e){return ''}}
  function meaningful(x){
    if(x?.tripState?.trips?.length)return true;
    if(x?.tripState?.members?.length)return true;
    return Object.values(x?.local||{}).some(v=>String(v||'').length>20);
  }
  function apply(x,reload){
    if(!x)return;
    try{
      if(x.tripState&&typeof state!=='undefined'){
        Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,JSON.parse(JSON.stringify(x.tripState)));
        if(typeof save==='function')save();
      }
      Object.entries(x.local||{}).forEach(([k,v])=>localStorage.setItem(k,v));
      last=sig(snap());
      if(reload)setTimeout(()=>location.reload(),300);else if(typeof renderAll==='function')renderAll();
    }catch(e){console.error('TripKhata cloud restore',e)}
  }
  function ref(uid){return db.collection('users').doc(uid).collection('appState').doc('main')}
  function status(txt){
    window.TRIPKHATA_CLOUD=window.TRIPKHATA_CLOUD||{};TRIPKHATA_CLOUD.status=txt;TRIPKHATA_CLOUD.lastSync=txt==='synced'?new Date():TRIPKHATA_CLOUD.lastSync;
    const b=document.getElementById('tkSyncBadge');if(b)b.textContent=txt==='synced'?'☁ Synced':txt==='offline'?'☁ Offline':'☁ '+txt;
  }
  function badge(){
    const top=document.querySelector('.topbar');if(!top)return;let b=document.getElementById('tkSyncBadge');
    if(!b){b=document.createElement('button');b.id='tkSyncBadge';b.className='iconbtn';b.style.cssText='font-size:11px;padding:6px 8px';b.onclick=()=>window.tripKhataSyncNow();top.appendChild(b)}
    if(!navigator.onLine)b.textContent='☁ Offline';else if(window.TK_AUTH?.currentUser)b.textContent='☁ '+(TRIPKHATA_CLOUD?.status==='synced'?'Synced':'Cloud');else b.textContent='☁ Local';
  }
  async function push(force){
    const u=window.TK_AUTH?.currentUser;if(!u||!db||!navigator.onLine)return;
    const x=snap(),h=sig(x);if(!force&&h===last)return;
    status('syncing');
    await ref(u.uid).set({snapshot:x,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:Date.now(),updatedBy:device,version:window.TRIPKHATA_VERSION||'0.6.0'},{merge:true});
    last=h;status('synced');badge();
  }
  async function first(u){
    const userRef=db.collection('users').doc(u.uid);
    await userRef.set({email:u.email||'',displayName:u.displayName||'',lastLogin:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    const d=await ref(u.uid).get(),local=snap();
    if(!d.exists||!d.data()?.snapshot){await push(true);return}
    const remote=d.data().snapshot;
    if(sig(remote)===sig(local)){last=sig(local);status('synced');return}
    if(!meaningful(local)){apply(remote,true);return}
    const useCloud=confirm('TripKhata cloud data found.\n\nOK = Cloud data load karo\nCancel = Is device da current data cloud te save karo');
    if(useCloud)apply(remote,true);else await push(true);
  }
  function watch(u){
    if(off)off();off=ref(u.uid).onSnapshot(d=>{
      if(!d.exists)return;const z=d.data()||{};if(z.updatedBy===device||!z.snapshot)return;
      const h=sig(z.snapshot);if(h&&h!==last){apply(z.snapshot,false);last=h;status('synced');badge()}
    },e=>console.warn('TripKhata cloud watch',e));
  }
  window.tripKhataSyncNow=async function(){try{await push(true);if(typeof toastMsg==='function')toastMsg('Cloud synced')}catch(e){alert('Sync error: '+e.message)}};
  window.tripKhataSyncStart=async function(u){
    try{
      clearInterval(timer);if(off){off();off=null}
      await loadFirestore();db=firebase.firestore();try{await db.enablePersistence({synchronizeTabs:true})}catch(e){}
      window.TRIPKHATA_CLOUD=window.TRIPKHATA_CLOUD||{};TRIPKHATA_CLOUD.enabled=true;
      await first(u);watch(u);timer=setInterval(()=>push(false).catch(()=>{}),12000);badge();
    }catch(e){console.error(e);status('error');badge()}
  };
  window.addEventListener('online',()=>{badge();push(false).catch(()=>{})});window.addEventListener('offline',()=>{status('offline');badge()});
  setInterval(badge,2000);
})();