/* TripKhata v0.8.0 — remember last opened module across refresh */
(function(){
'use strict';
const KEY='tripkhata_last_module_v080';
let restoring=false;

function remember(type){
  if(restoring)return;
  if(type==='customer'||type==='supplier')localStorage.setItem(KEY,type);
}
function clear(){localStorage.removeItem(KEY)}

function wrap(){
  if(typeof window.kbOpenMain==='function'&&!window.kbOpenMain.__tkPersist){
    const old=window.kbOpenMain;
    const fn=function(type){
      remember(type||'customer');
      return old.apply(this,arguments);
    };
    fn.__tkPersist=true;
    window.kbOpenMain=fn;
  }
  if(typeof window.closeKhataBook==='function'&&!window.closeKhataBook.__tkPersist){
    const old=window.closeKhataBook;
    const fn=function(){clear();return old.apply(this,arguments)};
    fn.__tkPersist=true;
    window.closeKhataBook=fn;
  }
}

function restore(){
  wrap();
  const type=localStorage.getItem(KEY);
  if(type!=='customer'&&type!=='supplier')return;
  if(typeof window.kbOpenMain!=='function')return;
  restoring=true;
  try{window.kbOpenMain(type)}catch(e){console.warn('TripKhata module restore',e)}
  finally{restoring=false}
}

setTimeout(restore,1400);
setTimeout(wrap,2200);
window.addEventListener('pageshow',()=>setTimeout(wrap,100));
window.tripKhataClearLastModule=clear;
})();