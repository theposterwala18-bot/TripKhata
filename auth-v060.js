/* TripKhata v0.6.0 Firebase Authentication */
(function(){
  const FBASE='https://www.gstatic.com/firebasejs/10.14.1/';
  function load(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=fail;document.head.appendChild(s)})}
  async function sdk(){
    if(window.firebase)return;
    await load(FBASE+'firebase-app-compat.js');
    await load(FBASE+'firebase-auth-compat.js');
  }
  function errbox(msg){const e=document.getElementById('tkAuthErr');if(e){e.style.display='block';e.textContent=String(msg||'Error').replace('Firebase: ','')}}
  function show(mode){
    mode=mode||'login';
    document.getElementById('tkAuthOverlay')?.remove();
    const d=document.createElement('div');d.id='tkAuthOverlay';
    d.style.cssText='position:fixed;inset:0;z-index:2500;background:rgba(8,31,68,.65);display:grid;place-items:center;padding:16px;font-family:system-ui';
    d.innerHTML='<div style="width:min(410px,100%);background:white;border-radius:22px;padding:22px;box-shadow:0 20px 60px #0004"><div style="text-align:center"><div style="font-size:30px">🧳</div><div style="font-size:25px;font-weight:900;color:#153d76">TripKhata</div><div style="font-size:12px;color:#76839a">Friends • Trips • Hisab Simple</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f2f6fb;padding:4px;border-radius:12px;margin-top:18px"><button id="tkLoginTab">Login</button><button id="tkSignupTab">Create Account</button></div><input id="tkAuthName" placeholder="Your name" style="display:none;width:100%;box-sizing:border-box;margin-top:12px;padding:12px;border:1px solid #d7e0ec;border-radius:11px"><input id="tkAuthEmail" type="email" placeholder="Email address" style="width:100%;box-sizing:border-box;margin-top:10px;padding:12px;border:1px solid #d7e0ec;border-radius:11px"><input id="tkAuthPass" type="password" placeholder="Password (minimum 6 characters)" style="width:100%;box-sizing:border-box;margin-top:10px;padding:12px;border:1px solid #d7e0ec;border-radius:11px"><div id="tkAuthErr" style="display:none;margin-top:9px;padding:9px;background:#fff1f0;color:#b3261e;border-radius:9px;font-size:12px"></div><button id="tkAuthMain" style="width:100%;margin-top:13px;padding:13px;border:0;border-radius:11px;background:#1677ff;color:white;font-weight:900">Login</button><button id="tkGoogle" style="width:100%;margin-top:8px;padding:13px;border:1px solid #d7e0ec;border-radius:11px;background:white;font-weight:850">G&nbsp;&nbsp; Continue with Google</button><div style="display:flex;justify-content:space-between;margin-top:11px"><button id="tkForgot" style="border:0;background:none;color:#1677ff">Forgot password?</button><button id="tkOffline" style="border:0;background:none;color:#6e7b91">Continue Offline</button></div></div>';
    document.body.appendChild(d);
    let m=mode;
    function setMode(x){m=x;const s=x==='signup';tkAuthName.style.display=s?'block':'none';tkAuthMain.textContent=s?'Create Account':'Login';tkForgot.style.visibility=s?'hidden':'visible';tkLoginTab.style.background=s?'transparent':'#fff';tkSignupTab.style.background=s?'#fff':'transparent';[tkLoginTab,tkSignupTab].forEach(b=>{b.style.border='0';b.style.padding='10px';b.style.borderRadius='9px';b.style.fontWeight='800'})}
    tkLoginTab.onclick=()=>setMode('login');tkSignupTab.onclick=()=>setMode('signup');setMode(m);
    tkOffline.onclick=()=>{sessionStorage.setItem('tk_offline','1');d.remove()};
    tkAuthMain.onclick=async()=>{try{tkAuthErr.style.display='none';const a=tkAuthEmail.value.trim(),p=tkAuthPass.value;if(m==='signup'){const c=await window.TK_AUTH.createUserWithEmailAndPassword(a,p);const n=tkAuthName.value.trim();if(n)await c.user.updateProfile({displayName:n})}else await window.TK_AUTH.signInWithEmailAndPassword(a,p)}catch(e){errbox(e.message)}};
    tkGoogle.onclick=async()=>{try{await window.TK_AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){errbox(e.message)}};
    tkForgot.onclick=async()=>{try{const a=tkAuthEmail.value.trim();if(!a)return errbox('Email address enter karo.');await window.TK_AUTH.sendPasswordResetEmail(a);alert('Password reset email send ho gayi.')}catch(e){errbox(e.message)}};
  }
  function badge(){
    const top=document.querySelector('.topbar');if(!top||!window.TK_AUTH)return;
    let b=document.getElementById('tkAccountBadge');if(!b){b=document.createElement('button');b.id='tkAccountBadge';b.className='iconbtn';b.style.cssText='font-size:14px;padding:6px 8px;min-width:34px;width:34px;text-align:center';b.onclick=()=>window.tripKhataAccount();top.appendChild(b)}
    const u=TK_AUTH.currentUser;const next=u?'👤':'👤';if(b.textContent!==next)b.textContent=next;b.title=u?((u.displayName||'')+' '+(u.email||'')):'Login / Signup';
  }
  function bindFirebaseUser(u){
    try{
      if(!u||typeof state==='undefined')return;
      const name=(u.displayName||u.email?.split('@')[0]||'User').trim();
      state.user=Object.assign({},state.user||{},{
        name,
        email:u.email||'',
        firebaseUid:u.uid,
        provider:'firebase',
        loggedIn:true
      });
      state.cloud={enabled:true,provider:'firebase'};
      if(typeof save==='function')save();
      if(typeof renderAll==='function')setTimeout(renderAll,50);
    }catch(e){console.warn('bindFirebaseUser',e)}
  }

  window.tripKhataAccount=function(){const u=window.TK_AUTH?.currentUser;if(!u)return show('login');if(confirm((u.displayName||'')+'\n'+(u.email||'')+'\n\nSign out?')){try{if(typeof state!=='undefined'){state.cloud={enabled:false,provider:null};if(state.user){state.user.loggedIn=false;delete state.user.firebaseUid;delete state.user.provider}if(typeof save==='function')save()}}catch(e){}TK_AUTH.signOut()}};
  async function init(){
    try{await sdk();if(!window.TRIPKHATA_FIREBASE_CONFIG)return;firebase.initializeApp(window.TRIPKHATA_FIREBASE_CONFIG);window.TK_AUTH=firebase.auth();TK_AUTH.onAuthStateChanged(u=>{document.getElementById('tkAuthOverlay')?.remove();if(u)bindFirebaseUser(u);badge();if(u&&window.tripKhataSyncStart)window.tripKhataSyncStart(u);if(!u&&!sessionStorage.getItem('tk_offline'))show('login')});}catch(e){console.error('Firebase auth init',e)}
  }
  setTimeout(init,500);
})();