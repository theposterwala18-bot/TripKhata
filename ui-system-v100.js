/* TripKhata v1.0.0 — shared visual type system only; no business logic */
(function(){
'use strict';
const s=document.createElement('style');
s.id='tk-ui-system-v100';
s.textContent=`
:root{
  --tk-font:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  --tk-body:14px;
  --tk-small:12px;
  --tk-title:20px;
  --tk-button:14px;
}
html,body,button,input,select,textarea{font-family:var(--tk-font)!important}
body{font-size:var(--tk-body)}
button,input,select,textarea{font-size:var(--tk-button)}

/* Customer Khata */
.kb50phone{font-family:var(--tk-font)!important;font-size:var(--tk-body)!important}
.kb50phone button{font-size:var(--tk-button)!important}
.kb50phone input,.kb50phone select,.kb50phone textarea{font-size:14px!important}
.kb50phone [style*="font-size:17px"]{font-size:15px!important}
.kb50phone [style*="font-size:16px"]{font-size:14px!important}
.kb50phone [style*="font-size:22px"]{font-size:18px!important}
.kb50phone [style*="font-size:28px"]{font-size:26px!important}

/* Keep intentional totals / balances visually highlighted */
.kb50phone [style*="font-size:23px"][style*="font-weight:850"]{font-size:22px!important}

/* Supplier / Business Ledger */
.s70app{font-family:var(--tk-font)!important;font-size:var(--tk-body)!important}
.s70head b{font-size:20px!important}
.s70biz select{font-size:15px!important}
.s70party b,.s70row b,.s70entry b{font-size:15px!important}
.s70party small,.s70row small,.s70entry small,.s70entry em{font-size:12px!important}
.s70tools button,.s70actions button,.s70ghost,.s70bottom button{font-size:14px!important}

/* Main Trip module — common text; amount/card emphasis remains untouched */
#app,main,.page,.card,.modal,.sheet{font-family:var(--tk-font)}
`;
document.head.appendChild(s);
})();