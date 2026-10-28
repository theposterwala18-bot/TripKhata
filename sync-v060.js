/* TripKhata v0.6.0 — Firestore private account sync */
(function(){
  let db=null,off=null,timer=null,last='',pushTimer=null,applyingRemote=false,syncReady=false;
  let lastLocalChangeAt=Number(localStorage.getItem('tripkhata_last_local_change')||0);
  let device=localStorage.getItem('tripkhata_device_id');
  if(!device){device='d_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);localStorage.setItem('tripkhata_device_id',device)}

  const originalSave=typeof window.save==='function'?window.save:null;
  const TRACKED_LOCAL_KEYS=new Set(['tripkhata_khatabook_v1','tripkhata_state','tripkhata_data','tripkhata_backup','tripkhata_settings']);
  function cacheCurrentState(){
    try{
      if(typeof state==='undefined')return;
      const copy=JSON.parse(JSON.stringify(state));
      delete copy.user; delete copy.cloud; delete copy.login; delete copy.auth;
      const u=window.TK_AUTH?.currentUser;
      const key=u?.uid?'tripkhata_account_cache_'+u.uid:(sessionStorage.getItem('tk_offline')?'tripkhata_guest_cache':'');
      if(key)localStorage.setItem(key,JSON.stringify(copy));
    }catch(e){}
  }
  function noteLocalChange(){
    if(applyingRemote)return;
    lastLocalChangeAt=Date.now();
    localStorage.setItem('tripkhata_last_local_change',String(lastLocalChangeAt));
    clearTimeout(pushTimer);
    if(syncReady && window.TK_AUTH?.currentUser){
      pushTimer=setTimeout(()=>push(false).catch(()=>{}),220);
    }
    try{window.dispatchEvent(new Event('tripkhata-local-change'))}catch(e){}
  }
  if(originalSave){
    window.save=function(sync=true){
      const r=originalSave.apply(this,arguments);
      if(!applyingRemote){
        cacheCurrentState();
        if(sync!==false)noteLocalChange();
        else try{window.dispatchEvent(new Event('tripkhata-local-change'))}catch(e){}
      }
      return r;
    };
  }
  const nativeSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    const r=nativeSetItem.apply(this,arguments);
    if(this===localStorage&&TRACKED_LOCAL_KEYS.has(String(key))&&!applyingRemote)noteLocalChange();
    return r;
  };

  function loadFirestore(){
    if(window.firebase&&firebase.firestore)return Promise.resolve();
    return new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js';s.onload=ok;s.onerror=fail;document.head.appendChild(s)});
  }
  function cleanData(x){try{return JSON.parse(JSON.stringify(x,(k,v)=>{if(typeof v==='string'&&v.startsWith('data:image/'))return null;if(typeof v==='string'&&v.length>200000)return null;return v}))}catch(e){return x}}
  function snap(){
    let trip=null;try{if(typeof state!=='undefined'){trip=cleanData(state);if(trip&&typeof trip==='object'){delete trip.user;delete trip.cloud;delete trip.login;delete trip.auth;}}}catch(e){}
    const local={};
    const APP_KEYS=[
      'tripkhata_khatabook_v1',
      'tripkhata_state',
      'tripkhata_data',
      'tripkhata_backup',
      'tripkhata_profile',
      'tripkhata_settings'
    ];
    for(const k of APP_KEYS){
      let v=localStorage.getItem(k);
      if(v==null||v.length>=2000000)continue;
      if(k==='tripkhata_khatabook_v1'){try{v=JSON.stringify(cleanData(JSON.parse(v)))}catch(e){}}
      local[k]=v;
    }
    return {tripState:trip,local};
  }
  function sig(x){try{return JSON.stringify(x)}catch(e){return ''}}
  function meaningful(x){
    if(x?.tripState?.trips?.length)return true;
    if(x?.tripState?.members?.length)return true;
    try{
      const raw=x?.local?.tripkhata_khatabook_v1;
      if(raw){
        const k=JSON.parse(raw);
        if((k?.customers||[]).length||(k?.suppliers||[]).length)return true;
        const sb=k?.supplierBusiness;
        if((sb?.businesses||[]).length||(sb?.parties||[]).length||(sb?.entries||[]).length)return true;
      }
    }catch(e){}
    return false;
  }
  function apply(x,reload){
    if(!x)return;
    applyingRemote=true;
    try{
      if(x.tripState&&typeof state!=='undefined'){
        const keepUser=state.user?JSON.parse(JSON.stringify(state.user)):null;
        const keepCloud=state.cloud?JSON.parse(JSON.stringify(state.cloud)):null;
        const keepActive=state.active||null;
        Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,JSON.parse(JSON.stringify(x.tripState)));
        if(keepUser)state.user=keepUser;
        if(keepCloud)state.cloud=keepCloud;
        state.active=(keepActive&&(state.trips||[]).some(t=>t.id===keepActive))?keepActive:null;
        if(originalSave)originalSave(false);else if(typeof save==='function')save(false);
      }
      const SAFE_KEYS=new Set(['tripkhata_khatabook_v1','tripkhata_state','tripkhata_data','tripkhata_backup','tripkhata_profile','tripkhata_settings']);
      Object.entries(x.local||{}).forEach(([k,v])=>{if(SAFE_KEYS.has(k))localStorage.setItem(k,v)});
      last=sig(snap());
      if(typeof renderAll==='function')setTimeout(renderAll,60);
    }catch(e){console.error('TripKhata cloud restore',e)}
    finally{applyingRemote=false}
  }
  function ref(uid){return db.collection('users').doc(uid).collection('appState').doc('main')}
  function status(txt){
    window.TRIPKHATA_CLOUD=window.TRIPKHATA_CLOUD||{};TRIPKHATA_CLOUD.status=txt;TRIPKHATA_CLOUD.lastSync=txt==='synced'?new Date():TRIPKHATA_CLOUD.lastSync;
    const b=document.getElementById('syncBadge')||document.getElementById('tkSyncBadge');if(b){const t=txt==='synced'?'● Synced':txt==='offline'?'● Offline':'● '+txt;if(b.textContent!==t)b.textContent=t;b.style.minWidth='68px'}
  }
  function badge(){
    const top=document.querySelector('.topbar');if(!top)return;
    let b=document.getElementById('syncBadge');
    if(!b){b=document.getElementById('tkSyncBadge')}
    if(!b){
      b=document.createElement('button');b.id='tkSyncBadge';b.className='iconbtn';
      b.style.cssText='font-size:11px;padding:6px 8px;min-width:68px;text-align:center';
      top.appendChild(b);
    }
    b.onclick=()=>window.tripKhataSyncNow();
    const next=!navigator.onLine?'● Offline':window.TK_AUTH?.currentUser?(TRIPKHATA_CLOUD?.status==='synced'?'● Synced':TRIPKHATA_CLOUD?.status==='choice'?'● Choose':'● Cloud'):'● Local';
    if(b.textContent!==next)b.textContent=next;
    b.style.minWidth='68px';
  }
  async function push(force,allowBeforeReady=false){
    const u=window.TK_AUTH?.currentUser;if(!u||!db||!navigator.onLine||(!syncReady&&!allowBeforeReady))return;
    const x=snap(),h=sig(x);if(!force&&h===last)return;
    status('syncing');
    const clientAt=Math.max(Date.now(),lastLocalChangeAt||0);
    await ref(u.uid).set({snapshot:x,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAtClient:clientAt,updatedBy:device,version:window.TRIPKHATA_VERSION||'0.6.0'},{merge:true});
    last=h;status('synced');badge();
  }
  function chooseSyncSource(){
    return new Promise(resolve=>{
      let old=document.getElementById('tkSyncChoice');if(old)old.remove();
      const d=document.createElement('div');d.id='tkSyncChoice';
      d.style.cssText='position:fixed;inset:0;z-index:2600;background:rgba(8,31,68,.68);display:grid;place-items:center;padding:16px;font-family:system-ui';
      d.innerHTML='<div style="width:min(430px,100%);background:white;border-radius:22px;padding:22px;box-shadow:0 20px 60px #0005"><div style="font-size:22px;font-weight:900;color:#153d76">Cloud data found</div><div style="margin-top:8px;color:#65738a;line-height:1.5;font-size:14px">Is account te cloud data te is device te local data dono mil rahe ne. Safe tarike naal ik source choose karo. Choice karan ton pehla koi data overwrite nahi hovega.</div><button id="tkUseCloud" style="width:100%;margin-top:18px;padding:14px;border:0;border-radius:12px;background:#1677ff;color:white;font-weight:900">Use Cloud Data</button><button id="tkUseDevice" style="width:100%;margin-top:10px;padding:14px;border:1px solid #d7e0ec;border-radius:12px;background:white;color:#17345f;font-weight:900">Keep This Device Data</button><div style="margin-top:12px;font-size:11px;color:#8a94a6;text-align:center">You can switch browser tabs; this screen will stay until you choose.</div></div>';
      document.body.appendChild(d);
      document.getElementById('tkUseCloud').onclick=()=>{d.remove();resolve('cloud')};
      document.getElementById('tkUseDevice').onclick=()=>{d.remove();resolve('device')};
    });
  }

  async function first(u){
    const decisionKey='tripkhata_cloud_initialized_'+u.uid;
    const userRef=db.collection('users').doc(u.uid);
    await userRef.set({email:u.email||'',displayName:u.displayName||'',lastLogin:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    const d=await ref(u.uid).get();
    const local=snap();
    const localHasData=meaningful(local);
    const remoteExists=!!(d.exists&&d.data()?.snapshot);
    const remote=remoteExists?d.data().snapshot:null;
    const remoteHasData=meaningful(remote);
    if(remoteExists && !localHasData){
      localStorage.setItem(decisionKey,'1');
      apply(remote,true); last=sig(remote); status('synced'); return;
    }
    if(!remoteExists){
      localStorage.setItem(decisionKey,'1');
      if(localHasData) await push(true,true); else {last=sig(local);status('synced');}
      return;
    }
    if(sig(remote)===sig(local)){
      localStorage.setItem(decisionKey,'1');last=sig(local);status('synced');return;
    }
    if(remoteHasData && localHasData){
      status('choice');
      const choice=await chooseSyncSource();
      localStorage.setItem(decisionKey,'1');
      if(choice==='cloud'){apply(remote,true);last=sig(remote);status('synced');return;}
      await push(true,true);return;
    }
    localStorage.setItem(decisionKey,'1');
    if(localHasData){await push(true,true);return;}
    last=sig(local);status('synced');
  }
  function watch(u){
    if(off)off();off=ref(u.uid).onSnapshot(d=>{
      if(!d.exists)return;
      const z=d.data()||{};
      if(z.updatedBy===device||!z.snapshot)return;
      const h=sig(z.snapshot);
      if(!h||h===last)return;
      const remoteAt=Number(z.updatedAtClient||0);
      const localNow=sig(snap());
      const hasLocalChanges=localNow!==last;
      if(hasLocalChanges && (!remoteAt || lastLocalChangeAt>=remoteAt)){
        push(false).catch(()=>{});
        return;
      }
      apply(z.snapshot,false);last=h;status('synced');badge();
    },e=>console.warn('TripKhata cloud watch',e));
  }
  window.tripKhataSyncNow=async function(){
    try{
      if(typeof renderAll==='function')renderAll();
      await push(true,true);
      if(typeof renderAll==='function')renderAll();
      if(typeof toastMsg==='function')toastMsg('Dashboard refreshed & cloud synced');
    }catch(e){alert('Sync error: '+e.message)}
  };
  window.tripKhataRefreshNow=window.tripKhataSyncNow;
  window.tripKhataSyncStart=async function(u){
    try{
      syncReady=false;
      clearTimeout(pushTimer);clearInterval(timer);if(off){off();off=null}
      await loadFirestore();db=firebase.firestore();try{await db.enablePersistence({synchronizeTabs:true})}catch(e){}
      window.TRIPKHATA_CLOUD=window.TRIPKHATA_CLOUD||{};TRIPKHATA_CLOUD.enabled=true;
      try{if(typeof state!=='undefined'){state.cloud={enabled:true,provider:'firebase'};if(typeof save==='function')save(false);}}catch(e){}
      await first(u);
      syncReady=true;
      last=sig(snap());
      watch(u);
      timer=setInterval(()=>push(false).catch(()=>{}),12000);
      badge();
    }catch(e){console.error(e);status('error');badge()}
  };
  window.addEventListener('online',()=>{badge();push(false).catch(()=>{})});window.addEventListener('offline',()=>{status('offline');badge()});
  })();