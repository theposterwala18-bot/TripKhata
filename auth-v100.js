/* TripKhata v1.0.0 — single clean authentication flow */
(function(){
'use strict';
const FBASE='https://www.gstatic.com/firebasejs/10.14.1/';
const $=s=>document.querySelector(s);
function load(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=fail;document.head.appendChild(s)})}
async function sdk(){
  if(!window.firebase){
    await load(FBASE+'firebase-app-compat.js');
    await load(FBASE+'firebase-auth-compat.js');
  }else if(!firebase.auth){
    await load(FBASE+'firebase-auth-compat.js');
  }
}
function removeSplash(){
  const s=$('#tkBootSplash');if(!s)return;
  s.style.opacity='0';setTimeout(()=>s.remove(),220);
}
function errbox(msg){
  const e=$('#tkAuthErr');if(e){e.style.display='block';e.textContent=String(msg||'Error').replace('Firebase: ','')}
}
function bindFirebaseUser(u){
  try{
    if(!u||typeof state==='undefined')return;
    const name=(u.displayName||u.phoneNumber||u.email?.split('@')[0]||'User').trim();
    state.user=Object.assign({},state.user||{},{
      name,email:u.email||'',phone:u.phoneNumber||state.user?.phone||'',
      firebaseUid:u.uid,provider:'firebase',loggedIn:true
    });
    state.cloud={enabled:true,provider:'firebase'};
    if(typeof save==='function')save();
    if(typeof renderAll==='function')setTimeout(renderAll,50);
  }catch(e){console.warn('bindFirebaseUser',e)}
}
function legacyGuest(){
  sessionStorage.setItem('tk_offline','1');
  const btn=[...document.querySelectorAll('button')].find(b=>/continue as guest/i.test((b.textContent||'').trim()));
  if(btn){try{btn.click();return}catch(e){}}
  try{
    if(typeof state!=='undefined'){
      state.user=Object.assign({},state.user||{},{name:state.user?.name||'Guest',loggedIn:false});
      state.cloud={enabled:false,provider:null};
      if(typeof save==='function')save();
      if(typeof renderAll==='function')renderAll();
    }
  }catch(e){}
}
function baseShell(){
  return '<div class="tk100authcard">'+
    '<div class="tk100brand"><img src="./icons/tripkhata-app-icon.png" alt=""><div><h1>TripKhata</h1><p>Friends • Trips • Hisab</p></div></div>'+
    '<div id="tkAuthErr" class="tk100err"></div>'+
    '<div id="tk100choices">'+
      '<button id="tkPhoneBtn" class="tk100primary" style="display:none">📱 Continue with Mobile OTP</button>'+
      '<button id="tkGoogle" class="tk100btn">G&nbsp;&nbsp; Continue with Google</button>'+
      '<button id="tkEmailBtn" class="tk100btn">✉️ Email Login</button>'+
      '<button id="tkGuest" class="tk100guest">Continue as Guest (Offline)</button>'+
    '</div>'+
    '<div id="tk100phone" class="tk100panel" style="display:none">'+
      '<button class="tk100back" data-back>← Back</button><h2>Mobile Login</h2><p>OTP tuhade mobile number te aayega.</p>'+
      '<input id="tkPhone" inputmode="tel" placeholder="+91 98765 43210">'+

      '<button id="tkSendOtp" class="tk100primary">Send OTP</button>'+
      '<div id="tkOtpWrap" style="display:none"><input id="tkOtp" inputmode="numeric" maxlength="6" placeholder="6-digit OTP"><button id="tkVerifyOtp" class="tk100primary">Verify & Continue</button></div>'+
    '</div>'+
    '<div id="tk100email" class="tk100panel" style="display:none">'+
      '<button class="tk100back" data-back>← Back</button><h2>Email Login</h2>'+
      '<input id="tkAuthName" placeholder="Your name" style="display:none">'+
      '<input id="tkAuthEmail" type="email" placeholder="Email address">'+
      '<input id="tkAuthPass" type="password" placeholder="Password">'+
      '<button id="tkAuthMain" class="tk100primary">Login</button>'+
      '<div class="tk100links"><button id="tkForgot">Forgot password?</button><button id="tkSignupToggle">Create account</button></div>'+
    '</div>'+
  '</div>';
}
function show(){
  $('#tkAuthOverlay')?.remove();
  const d=document.createElement('div');d.id='tkAuthOverlay';d.innerHTML=baseShell();document.body.appendChild(d);
  let emailSignup=false,phoneConfirmation=null,recaptcha=null;
  const choices=$('#tk100choices'),phonePanel=$('#tk100phone'),emailPanel=$('#tk100email');
  function main(){choices.style.display='block';phonePanel.style.display='none';emailPanel.style.display='none';$('#tkAuthErr').style.display='none'}
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=main);
  $('#tkPhoneBtn').onclick=()=>{choices.style.display='none';phonePanel.style.display='block'};
  $('#tkEmailBtn').onclick=()=>{choices.style.display='none';emailPanel.style.display='block'};
  $('#tkGoogle').onclick=async()=>{try{await window.TK_AUTH.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){errbox(e.message)}};
  $('#tkGuest').onclick=()=>{d.remove();removeSplash();legacyGuest()};

  $('#tkSignupToggle').onclick=()=>{
    emailSignup=!emailSignup;
    $('#tkAuthName').style.display=emailSignup?'block':'none';
    $('#tkAuthMain').textContent=emailSignup?'Create Account':'Login';
    $('#tkSignupToggle').textContent=emailSignup?'Already have account? Login':'Create account';
    $('#tkForgot').style.visibility=emailSignup?'hidden':'visible';
  };
  $('#tkAuthMain').onclick=async()=>{
    try{
      $('#tkAuthErr').style.display='none';
      const email=$('#tkAuthEmail').value.trim(),pass=$('#tkAuthPass').value;
      if(!email||!pass)return errbox('Email te password enter karo.');
      if(emailSignup){
        const cred=await window.TK_AUTH.createUserWithEmailAndPassword(email,pass);
        const name=$('#tkAuthName').value.trim();if(name)await cred.user.updateProfile({displayName:name});
      }else await window.TK_AUTH.signInWithEmailAndPassword(email,pass);
    }catch(e){errbox(e.message)}
  };
  $('#tkForgot').onclick=async()=>{
    const email=$('#tkAuthEmail').value.trim();if(!email)return errbox('Pehla email enter karo.');
    try{await window.TK_AUTH.sendPasswordResetEmail(email);alert('Password reset email sent.')}catch(e){errbox(e.message)}
  };
  $('#tkSendOtp').onclick=async()=>{
    try{
      $('#tkAuthErr').style.display='none';
      let phone=$('#tkPhone').value.replace(/\s+/g,'').trim();
      if(/^\d{10}$/.test(phone))phone='+91'+phone;
      if(!/^\+\d{10,15}$/.test(phone))return errbox('Valid mobile number country code nal enter karo.');
      if(recaptcha){try{recaptcha.clear()}catch(e){}}
      recaptcha=new firebase.auth.RecaptchaVerifier('tkSendOtp',{
        size:'invisible',
        callback:()=>{},
        'expired-callback':()=>{try{recaptcha.clear()}catch(_){};recaptcha=null}
      });
      phoneConfirmation=await window.TK_AUTH.signInWithPhoneNumber(phone,recaptcha);
      $('#tkOtpWrap').style.display='block';$('#tkSendOtp').textContent='OTP Sent';
    }catch(e){
      const code=e.code||'';
      if(code==='auth/operation-not-allowed') errbox('Mobile OTP request allow nahi hoi. Firebase Phone provider enabled hai tan Authentication → Settings → SMS region policy vich India allow karo.');
      else if(code==='auth/unauthorized-domain') errbox('Eh website domain Firebase Authorized domains vich add nahi hai.');
      else if(code==='auth/billing-not-enabled') errbox('Mobile OTP layi Firebase project te Cloud Billing link karni zaroori hai. Google/Email login meanwhile fully available ne.');
      else if(code==='auth/quota-exceeded') errbox('Aj da Firebase SMS quota complete ho gaya.');
      else errbox((e.message||'OTP send nahi ho saki')+(code?' ['+code+']':''));
    }
  };
  $('#tkVerifyOtp').onclick=async()=>{
    try{
      const code=$('#tkOtp').value.trim();
      if(!phoneConfirmation||code.length!==6)return errbox('6-digit OTP enter karo.');
      await phoneConfirmation.confirm(code);
    }catch(e){errbox(e.message)}
  };
}
function badge(){
  try{
    const top=document.querySelector('.topbar,.header,.app-header');
    if(!top)return;
  }catch(e){}
}
window.tripKhataAccount=function(){
  const u=window.TK_AUTH?.currentUser;
  if(!u)return show();
  if(confirm((u.displayName||u.phoneNumber||u.email||'Account')+'\n\nSign out?')){
    try{
      if(typeof state!=='undefined'){
        state.cloud={enabled:false,provider:null};
        if(state.user){state.user.loggedIn=false;delete state.user.firebaseUid;delete state.user.provider}
        if(typeof save==='function')save();
      }
    }catch(e){}
    window.TK_AUTH.signOut();
  }
};
async function init(){
  try{
    await sdk();
    if(!window.TRIPKHATA_FIREBASE_CONFIG){removeSplash();return}
    if(!firebase.apps?.length)firebase.initializeApp(window.TRIPKHATA_FIREBASE_CONFIG);
    window.TK_AUTH=firebase.auth();
    TK_AUTH.onAuthStateChanged(u=>{
      if(u){
        $('#tkAuthOverlay')?.remove();bindFirebaseUser(u);removeSplash();
        if(window.tripKhataSyncStart)window.tripKhataSyncStart(u);
      }else{
        if(sessionStorage.getItem('tk_offline')){removeSplash();return}
        show();setTimeout(removeSplash,350);
      }
    });
  }catch(e){
    console.error('Firebase auth init',e);removeSplash();show();errbox(e.message);
  }
}
setTimeout(init,250);

const st=document.createElement('style');
st.textContent=`
#tkAuthOverlay{position:fixed;inset:0;z-index:6000;background:#f7f9ff;display:grid;place-items:center;padding:18px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.tk100authcard{width:min(420px,100%);background:#fff;border:1px solid #e4eaf2;border-radius:24px;padding:24px;box-sizing:border-box;box-shadow:0 18px 60px #17325d18}
.tk100brand{display:flex;align-items:center;gap:13px;margin-bottom:20px}.tk100brand img{width:58px;height:58px;border-radius:16px}.tk100brand h1{margin:0;color:#111827;font-size:28px}.tk100brand p{margin:3px 0 0;color:#718096;font-size:12px}
.tk100btn,.tk100primary,.tk100guest{width:100%;padding:13px 14px;border-radius:12px;font-weight:850;font-size:14px;margin-top:9px}
.tk100btn{border:1px solid #d7e0ec;background:#fff;color:#17243a}.tk100primary{border:0;background:#2481ff;color:#fff}.tk100guest{border:0;background:#f2f5f9;color:#4d5d73}
.tk100panel h2{margin:8px 0 3px;font-size:20px}.tk100panel p{margin:0 0 12px;color:#78869a;font-size:12px}.tk100panel input{width:100%;box-sizing:border-box;margin-top:9px;padding:12px;border:1px solid #d7e0ec;border-radius:11px;font-size:14px}
.tk100back{border:0;background:transparent;color:#1558b0;font-weight:800;padding:4px 0}.tk100links{display:flex;justify-content:space-between;margin-top:11px}.tk100links button{border:0;background:none;color:#1677ff;font-size:12px}
.tk100err{display:none;margin:0 0 10px;padding:9px;background:#fff1f0;color:#b3261e;border-radius:9px;font-size:12px}
#tkRecaptcha{margin-top:10px}
`;
document.head.appendChild(st);
})();