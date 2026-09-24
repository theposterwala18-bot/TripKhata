/* TripKhata v0.6.1 — Final launch UI polish */
(function(){
  const OWNER_EMAIL='dhaliwalballi18@gmail.com';
  const PROFILE_KEY='tripkhata_profile';
  const APP_ICON_DATA='data:image/png;base64,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';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function profile(){
    let p={};try{p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')||{}}catch(e){}
    const u=window.TK_AUTH?.currentUser;
    return {name:p.name||u?.displayName||state?.user?.name||'TripKhata User',email:u?.email||state?.user?.email||'',bio:p.bio||'',phone:p.phone||'',photo:p.photo||u?.photoURL||''};
  }
  function saveProfile(p){localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}
  function initials(name){return String(name||'TK').trim().split(/s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'TK'}
  function compress(file){
    return new Promise((ok,fail)=>{
      const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const size=180,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');const sc=Math.max(size/im.width,size/im.height),w=im.width*sc,h=im.height*sc;x.drawImage(im,(size-w)/2,(size-h)/2,w,h);ok(c.toDataURL('image/jpeg',.72))};im.onerror=fail;im.src=r.result};r.onerror=fail;r.readAsDataURL(file)
    })
  }
  function stableHeader(){
    const top=$('.topbar');if(!top)return;
    top.classList.add('tkFinalTopbar');
    $('#kbLauncher')?.remove();
    $('#tkAccountBadge')?.remove();
    $('#tkVersionBadge')?.remove();

    // Remove duplicate person/account buttons created by old layers.
    $$('.topbar button.iconbtn').forEach(b=>{
      const id=b.id||'',t=(b.textContent||'').trim(),title=(b.title||'').toLowerCase();
      if(id==='syncBadge'||id==='tkSyncBadge'||id==='tkProfileBtn')return;
      if(t.includes('👤')||title.includes('profile')||title.includes('account'))b.remove();
    });

    // Replace legacy TK block with the official TripKhata wallet icon.
    const tkLeaf=[...top.querySelectorAll('*')].find(e=>e.children.length===0&&(e.textContent||'').trim()==='TK');
    if(tkLeaf){
      tkLeaf.innerHTML='<img src="'+APP_ICON_DATA+'" alt="TripKhata">';
      tkLeaf.style.padding='0';tkLeaf.style.overflow='hidden';
      const im=tkLeaf.querySelector('img');if(im)im.style.cssText='width:100%;height:100%;object-fit:contain;display:block';
    }

    // Find title block and place version below app name.
    const title=[...top.querySelectorAll('*')].find(e=>e.children.length===0&&(e.textContent||'').trim()==='TripKhata');
    if(title){
      const box=title.parentElement;
      if(box&&!$('#tkHeaderMeta')){
        const m=document.createElement('div');m.id='tkHeaderMeta';
        m.innerHTML='<span>v'+(window.TRIPKHATA_VERSION||'0.6.1')+'</span><span>•</span><span>Secure cloud sync</span>';
        box.appendChild(m);
      } else if($('#tkHeaderMeta')) $('#tkHeaderMeta span').textContent='v'+(window.TRIPKHATA_VERSION||'0.6.1');
    }

    // Normalize sync control.
    let sync=$('#syncBadge')||$('#tkSyncBadge');
    if(!sync){
      sync=document.createElement('button');sync.id='tkSyncBadge';sync.className='iconbtn';top.appendChild(sync);
    }
    sync.classList.add('tkSyncPill');
    sync.onclick=()=>window.tripKhataSyncNow?.();
    const st=window.TRIPKHATA_CLOUD?.status;
    const syncText=!navigator.onLine?'Offline':st==='synced'?'Synced':st==='syncing'?'Syncing':st==='choice'?'Choose':'Cloud';
    sync.innerHTML='<span class="tkCloudIcon">☁</span><span>'+syncText+'</span>';
    sync.title='Cloud Sync';

    // One clear profile/avatar button only.
    let pb=$('#tkProfileBtn');
    if(!pb){pb=document.createElement('button');pb.id='tkProfileBtn';pb.className='iconbtn tkProfileBtn';top.appendChild(pb)}
    const p=profile();
    pb.innerHTML=p.photo?'<img src="'+esc(p.photo)+'" alt="Profile">':'<span>'+esc(initials(p.name))+'</span>';
    pb.title='Profile';
    pb.onclick=openProfile;
  }

  function openProfile(){
    document.getElementById('tkFinalProfile')?.remove();
    const p=profile(),u=window.TK_AUTH?.currentUser,owner=(u?.email||'').toLowerCase()===OWNER_EMAIL;
    const d=document.createElement('div');d.id='tkFinalProfile';d.className='tkModalShade';
    d.innerHTML=`<div class="tkProfileSheet">
      <div class="tkSheetHandle"></div>
      <div class="tkSheetTop"><div><div class="tkSheetTitle">Profile & Account</div><div class="tkSheetSub">Manage your TripKhata identity and sync</div></div><button id="tkCloseProfile">✕</button></div>
      <div class="tkAvatarEdit">
        <div id="tkBigAvatar" class="tkBigAvatar">${p.photo?'<img src="'+esc(p.photo)+'">':esc(initials(p.name))}</div>
        <div><b>${esc(p.name)}</b><div class="tkMuted">${esc(p.email||'No email')}</div><label class="tkLinkBtn">Change photo<input id="tkPhotoPick" type="file" accept="image/*" style="display:none"></label></div>
      </div>
      <div class="tkFormGrid">
        <label>Display name<input id="tkProfName" value="${esc(p.name)}"></label>
        <label>Phone (optional)<input id="tkProfPhone" value="${esc(p.phone)}" inputmode="tel"></label>
        <label class="tkFull">Bio<textarea id="tkProfBio" placeholder="A short profile bio...">${esc(p.bio)}</textarea></label>
      </div>
      <div class="tkSyncCard"><div><b>☁ Cloud Sync</b><div class="tkMuted">Firebase account: ${esc(p.email||'Not signed in')}</div></div><span class="tkStatus">${navigator.onLine?(window.TRIPKHATA_CLOUD?.status==='synced'?'Synced':'Connected'):'Offline'}</span></div>
      <div class="tkActionGrid">
        <button id="tkSaveProfile" class="tkPrimary">Save Profile</button>
        <button id="tkSyncNow">☁ Sync Now</button>
      </div>
      <div class="tkInfoCard"><b>Contact & Feedback</b><div class="tkMuted">Need help or want to suggest an improvement?</div>
        <div class="tkActionGrid"><a href="mailto:${OWNER_EMAIL}?subject=TripKhata%20Support">✉ Contact</a><a href="mailto:${OWNER_EMAIL}?subject=TripKhata%20Feedback%20%2F%20Suggestion">💬 Feedback</a></div>
        <div class="tkOwnerEmail">${OWNER_EMAIL}</div>
        <div class="tkActionGrid"><a href="./privacy.html">🔒 Privacy Policy</a><a href="./delete-account.html" style="color:#c73531">🗑 Delete Account</a></div>
      </div>
      ${owner?'<div class="tkInfoCard"><b>Owner Tools</b><div class="tkMuted">Launch/admin utilities for this device.</div><div class="tkActionGrid"><button id="tkOwnerSync">Force Sync</button><button id="tkOwnerInfo">Copy App Info</button></div></div>':''}
      <button id="tkSignOut" class="tkDanger">Sign Out</button>
    </div>`;
    document.body.appendChild(d);
    $('#tkCloseProfile').onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()};
    $('#tkPhotoPick').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;const img=await compress(f);$('#tkBigAvatar').innerHTML='<img src="'+img+'">';$('#tkBigAvatar').dataset.photo=img};
    $('#tkSaveProfile').onclick=async()=>{
      const next={name:$('#tkProfName').value.trim()||p.name,phone:$('#tkProfPhone').value.trim(),bio:$('#tkProfBio').value.trim(),photo:$('#tkBigAvatar').dataset.photo||p.photo||''};
      saveProfile(next);
      try{
        if(typeof state!=='undefined'){state.user=Object.assign({},state.user||{},{name:next.name,bio:next.bio,phone:next.phone});window.save?.()}
        if(u&&next.name!==u.displayName)await u.updateProfile({displayName:next.name});
        if(window.firebase?.firestore&&u)await firebase.firestore().collection('users').doc(u.uid).set({displayName:next.name,bio:next.bio,phone:next.phone,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        await window.tripKhataSyncNow?.();
      }catch(e){console.warn(e)}
      stableHeader();d.remove();
    };
    $('#tkSyncNow').onclick=()=>window.tripKhataSyncNow?.();
    $('#tkSignOut').onclick=()=>{d.remove();window.tripKhataAccount?.()};
    if(owner){
      $('#tkOwnerSync').onclick=()=>window.tripKhataSyncNow?.();
      $('#tkOwnerInfo').onclick=async()=>{const info='TripKhata v'+(window.TRIPKHATA_VERSION||'')+' | '+(window.TRIPKHATA_CLOUD?.status||'unknown')+' | '+location.href;try{await navigator.clipboard.writeText(info);alert('App info copied.')}catch(e){alert(info)}};
    }
  }

  function settingsCard(){
    const set=$('#page-settings');if(!set)return;
    $('#tkOldFinalCard')?.remove();
    if($('#tkLaunchSupportCard'))return;
    const c=document.createElement('div');c.id='tkLaunchSupportCard';c.className='card tkLaunchCard';
    c.innerHTML='<div class="cardtitle">Help, Feedback & Account</div><div class="muted small" style="margin-top:4px">TripKhata v'+(window.TRIPKHATA_VERSION||'0.6.1')+'</div><div class="tkSettingsGrid"><button id="tkSettingsProfile">👤 Profile</button><button id="tkSettingsSync">☁ Sync Now</button><a href="mailto:'+OWNER_EMAIL+'?subject=TripKhata%20Feedback%20%2F%20Suggestion">💬 Feedback</a><a href="mailto:'+OWNER_EMAIL+'?subject=TripKhata%20Support">✉ Contact</a></div><div class="tkContactLine">'+OWNER_EMAIL+'</div><div class="tkSettingsGrid"><a href="./privacy.html">🔒 Privacy Policy</a><a href="./delete-account.html" style="color:#c73531">🗑 Delete Account</a></div>';
    set.appendChild(c);
    $('#tkSettingsProfile').onclick=openProfile;$('#tkSettingsSync').onclick=()=>window.tripKhataSyncNow?.();
  }

  function polish(){
    stableHeader();settingsCard();
    const bar=$('#tkServiceBar');if(bar)bar.classList.add('tkFinalServiceBar');
  }

  const css=document.createElement('style');css.textContent=`
    .tkFinalTopbar{gap:8px!important;min-height:72px!important;padding:10px 12px!important;align-items:center!important}
    #tkHeaderMeta{display:flex;gap:5px;align-items:center;font-size:9px;color:#7890ad;margin-top:2px;font-weight:700}
    .tkSyncPill{min-width:76px!important;width:auto!important;padding:7px 9px!important;border-radius:12px!important;font-size:10px!important;display:flex!important;gap:5px!important;align-items:center!important;justify-content:center!important;white-space:nowrap}
    .tkCloudIcon{font-size:13px}.tkProfileBtn{width:38px!important;min-width:38px!important;height:38px!important;border-radius:50%!important;padding:0!important;overflow:hidden!important;background:#eef3ff!important;color:#4f46a5!important;font-weight:900!important}
    .tkProfileBtn img,.tkBigAvatar img{width:100%;height:100%;object-fit:cover}
    .tkFinalServiceBar{top:72px!important}
    .tkModalShade{position:fixed;inset:0;z-index:3000;background:#10244499;display:flex;align-items:flex-end;justify-content:center;padding:0}
    .tkProfileSheet{background:#fff;width:min(560px,100%);max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:16px 18px 24px;box-shadow:0 -20px 60px #0003}
    .tkSheetHandle{width:48px;height:5px;border-radius:10px;background:#d5dce6;margin:0 auto 14px}.tkSheetTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.tkSheetTop button{border:0;background:#f1f4f8;border-radius:10px;padding:8px}.tkSheetTitle{font-size:23px;font-weight:900;color:#13284b}.tkSheetSub,.tkMuted{font-size:12px;color:#738198;margin-top:3px}
    .tkAvatarEdit{display:flex;gap:14px;align-items:center;padding:16px 0;border-bottom:1px solid #edf0f5}.tkBigAvatar{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:#e8e8ff;color:#5146a5;font-size:22px;font-weight:900;overflow:hidden}.tkLinkBtn{display:inline-block;margin-top:7px;color:#1677ff;font-size:12px;font-weight:800;cursor:pointer}
    .tkFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.tkFormGrid label{font-size:12px;color:#617086;font-weight:700}.tkFormGrid input,.tkFormGrid textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid #dce3ed;border-radius:11px;font:inherit}.tkFormGrid textarea{min-height:78px;resize:vertical}.tkFull{grid-column:1/-1}
    .tkSyncCard,.tkInfoCard{margin-top:14px;border:1px solid #e3e9f1;border-radius:15px;padding:14px;background:#fbfcfe}.tkSyncCard{display:flex;justify-content:space-between;align-items:center}.tkStatus{font-size:11px;font-weight:900;color:#16734a;background:#eaf8f1;padding:6px 9px;border-radius:999px}
    .tkActionGrid,.tkSettingsGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.tkActionGrid button,.tkActionGrid a,.tkSettingsGrid button,.tkSettingsGrid a{border:1px solid #dce5f1;background:#fff;color:#1558b0;border-radius:11px;padding:12px;text-decoration:none;text-align:center;font-weight:800}.tkActionGrid .tkPrimary{background:#1677ff;color:#fff;border-color:#1677ff}.tkDanger{width:100%;margin-top:14px;padding:13px;border:0;border-radius:12px;background:#fff0ef;color:#cb352f;font-weight:900}.tkOwnerEmail,.tkContactLine{margin-top:9px;font-size:11px;color:#718097;word-break:break-all}.tkLaunchCard{margin-top:12px}.tkSettingsGrid{margin-top:10px}
    @media(max-width:520px){.tkFinalTopbar{padding:9px 10px!important}.tkSyncPill{min-width:66px!important;font-size:9px!important;padding:6px!important}.tkProfileBtn{width:34px!important;min-width:34px!important;height:34px!important}.tkFormGrid{grid-template-columns:1fr}.tkFull{grid-column:auto}.tkActionGrid,.tkSettingsGrid{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(css);

  // Wrap real renders once; no polling.
  ['renderAll','renderTrip','renderSettings'].forEach(k=>{const old=window[k];if(typeof old==='function'&&!old.__tkFinal){const w=function(){const r=old.apply(this,arguments);setTimeout(polish,0);return r};w.__tkFinal=true;window[k]=w}});
  window.addEventListener('online',()=>setTimeout(stableHeader,0));window.addEventListener('offline',()=>setTimeout(stableHeader,0));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(polish,100));
  setTimeout(polish,300);
  window.tkFinalPolish=polish;
})();