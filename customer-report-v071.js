
(function(){
  'use strict';
  const KEY='tripkhata_khatabook_v1';
  const OWNER_EMAIL='dhaliwalballi18@gmail.com';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}}
  function customer(id){return (load().customers||[]).find(x=>x.id===id)}
  function showPicker(id){
    document.getElementById('cr071')?.remove();
    const x=customer(id); if(!x)return;
    const d=document.createElement('div'); d.id='cr071';
    d.innerHTML='<div class="crShade"><div class="crSheet"><div class="crHandle"></div><div class="crTop"><div><b>Customer Statement</b><span>'+esc(x.name)+'</span></div><button id="crClose">✕</button></div><p>Choose date range. Opening balance before From date will be included automatically.</p><div class="crGrid"><label>From<input id="crFrom" type="date"></label><label>To<input id="crTo" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label></div><div class="crQuick"><button id="crAll">All Time</button><button id="crMonth">This Month</button></div><button class="crPrimary" id="crOpen">View / Save PDF</button></div></div>';
    document.body.appendChild(d);
    $('#crClose').onclick=()=>d.remove();
    $('#crAll').onclick=()=>{$('#crFrom').value=''};
    $('#crMonth').onclick=()=>{const n=new Date();$('#crFrom').value=new Date(n.getFullYear(),n.getMonth(),1).toISOString().slice(0,10);$('#crTo').value=n.toISOString().slice(0,10)};
    $('#crOpen').onclick=()=>build(id,$('#crFrom').value,$('#crTo').value);
  }
  function build(id,from,to){
    const root=load(),x=(root.customers||[]).find(z=>z.id===id);if(!x)return;
    const fd=from?new Date(from+'T00:00:00'):new Date(0),td=to?new Date(to+'T23:59:59'):new Date();
    const all=[...(x.entries||[])].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const sign=e=>e.kind==='gave'?Number(e.amount||0):-Number(e.amount||0);
    const opening=all.filter(e=>new Date(e.date)<fd).reduce((s,e)=>s+sign(e),0);
    const period=all.filter(e=>new Date(e.date)>=fd&&new Date(e.date)<=td);
    let run=opening,debit=0,credit=0;
    const rows=period.map(e=>{
      const a=Number(e.amount)||0;
      if(e.kind==='gave'){run+=a;debit+=a}else{run-=a;credit+=a}
      return '<tr><td>'+new Date(e.date).toLocaleDateString('en-GB')+'</td><td>'+esc(e.note||'')+'</td><td class="num">'+(e.kind==='gave'?money(a):'')+'</td><td class="num">'+(e.kind==='got'?money(a):'')+'</td><td class="num">'+money(Math.abs(run))+' '+(run>=0?'Dr':'Cr')+'</td></tr>';
    }).join('');
    const closing=run, owner=root.profile?.name||'TripKhata';
    const w=window.open('','_blank');if(!w)return alert('Popup blocked. Allow popups for PDF report.');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(x.name)+' Statement</title><style>'+
      'body{font-family:Arial,sans-serif;color:#222;margin:0;background:#fff}.page{max-width:920px;margin:0 auto;padding:26px}.top{background:#0d4d94;color:#fff;padding:14px 18px;display:flex;justify-content:space-between}.top b{font-size:18px}.info{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px 0}.info .right{text-align:right}.muted{color:#6f7782;font-size:12px}.balance{border:1px solid #d9dee6;border-radius:6px;padding:14px;display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;margin-bottom:16px}.balance div{border-right:1px solid #e5e8ed}.balance div:last-child{border:0}.balance span{display:block;color:#68717c;font-size:12px}.balance b{display:block;font-size:18px;margin-top:5px}.red{color:#c73131}.green{color:#278546}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f3f6;text-align:left}th,td{border:1px solid #d8dde5;padding:8px}.num{text-align:right}.summary{margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d8dde5}.summary div{padding:10px;text-align:center;border-right:1px solid #d8dde5}.summary div:last-child{border:0}.summary span{display:block;color:#737c88;font-size:11px}.foot{margin-top:18px;color:#7d8590;font-size:10px;display:flex;justify-content:space-between}.actions{margin-top:18px}.actions button{padding:10px 14px;border:0;border-radius:8px;background:#1558b0;color:#fff;font-weight:700}@media print{.actions{display:none}.page{max-width:none;padding:12mm}.top{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
      '</style></head><body><div class="page"><div class="top"><b>'+esc(owner)+'</b><span>TripKhata Customer Statement</span></div>'+
      '<div class="info"><div><div class="muted">Account / Business</div><h2 style="margin:5px 0">'+esc(owner)+'</h2><div class="muted">'+OWNER_EMAIL+'</div></div><div class="right"><div class="muted">Created on: '+new Date(x.createdAt||Date.now()).toLocaleDateString('en-GB')+'</div><h3 style="margin:5px 0">Customer: '+esc(x.name)+'</h3><div>'+esc(x.phone||'')+'</div>'+(x.address?'<div class="muted">'+esc(x.address)+'</div>':'')+'</div></div>'+
      '<div class="balance"><div><span>Opening Balance</span><b>'+money(Math.abs(opening))+' '+(opening>=0?'Dr':'Cr')+'</b></div><div><span>Statement Period</span><b style="font-size:14px">'+(from||'Beginning')+' — '+(to||'Today')+'</b></div><div><span>Closing Balance</span><b class="'+(closing>=0?'red':'green')+'">'+money(Math.abs(closing))+' '+(closing>=0?'Dr':'Cr')+'</b></div></div>'+
      '<table><thead><tr><th>Date</th><th>Details</th><th class="num">Debit / You Gave</th><th class="num">Credit / You Got</th><th class="num">Running Balance</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;padding:25px">No entries in selected period.</td></tr>')+'</tbody></table>'+
      '<div class="summary"><div><span>Total Debit</span><b>'+money(debit)+'</b></div><div><span>Total Credit</span><b>'+money(credit)+'</b></div><div><span>Net Movement</span><b>'+money(Math.abs(debit-credit))+'</b></div><div><span>Current Balance</span><b>'+money(Math.abs(closing))+'</b></div></div>'+
      '<div class="foot"><span>Generated by TripKhata</span><span>Contact: '+OWNER_EMAIL+'</span></div><div class="actions"><button onclick="print()">Print / Save PDF</button></div></div></body></html>');
    w.document.close();
  }
  const old=window.kbEntityReport;
  window.kbEntityReport=function(type,id){if(type==='customer')return showPicker(id);return old?old(type,id):null};
  const st=document.createElement('style');st.textContent='.crShade{position:fixed;inset:0;z-index:2000;background:#10233f88;display:flex;align-items:flex-end;justify-content:center}.crSheet{width:min(540px,100%);background:#fff;border-radius:22px 22px 0 0;padding:16px 18px 24px;box-shadow:0 -15px 50px #0002}.crHandle{width:46px;height:5px;background:#d5dce6;border-radius:8px;margin:0 auto 14px}.crTop{display:flex;justify-content:space-between;align-items:flex-start}.crTop b,.crTop span{display:block}.crTop b{font-size:21px}.crTop span{font-size:12px;color:#718096}.crTop button{border:0;background:#f0f4f8;border-radius:10px;padding:8px}.crSheet p{font-size:12px;color:#687689;line-height:1.5}.crGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.crGrid label{font-size:12px;color:#667}.crGrid input{width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border:1px solid #d8e1ec;border-radius:10px}.crQuick{display:flex;gap:8px;margin-top:10px}.crQuick button{border:1px solid #d5e0ee;background:#f7faff;border-radius:9px;padding:8px}.crPrimary{width:100%;margin-top:14px;padding:13px;border:0;border-radius:11px;background:#1558b0;color:#fff;font-weight:900}';document.head.appendChild(st);
})();