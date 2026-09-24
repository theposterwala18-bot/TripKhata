
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
    d.innerHTML='<div class="crShade"><div class="crSheet"><div class="crHandle"></div><div class="crTop"><div><b>Customer Statement</b><span>'+esc(x.name)+'</span></div><button id="crClose">✕</button></div><p>Choose date range. Opening balance before From date will be included automatically.</p><div class="crGrid"><label>From<input id="crFrom" type="date"></label><label>To<input id="crTo" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label></div><div class="crQuick"><button id="crAll">All Time</button><button id="crMonth">This Month</button><button id="crLastMonth">Last Month</button></div><button class="crPrimary" id="crOpen">View / Save PDF</button></div></div>';
    document.body.appendChild(d);
    $('#crClose').onclick=()=>d.remove();
    $('#crAll').onclick=()=>{$('#crFrom').value=''};
    $('#crMonth').onclick=()=>{const n=new Date();$('#crFrom').value=new Date(n.getFullYear(),n.getMonth(),1).toISOString().slice(0,10);$('#crTo').value=n.toISOString().slice(0,10)};$('#crLastMonth').onclick=()=>{const n=new Date(),s=new Date(n.getFullYear(),n.getMonth()-1,1),e=new Date(n.getFullYear(),n.getMonth(),0);$('#crFrom').value=s.toISOString().slice(0,10);$('#crTo').value=e.toISOString().slice(0,10)};
    $('#crOpen').onclick=()=>build(id,$('#crFrom').value,$('#crTo').value);
  }
  function build(id,from,to){
    const root=load(),x=(root.customers||[]).find(z=>z.id===id);if(!x)return;
    const fd=from?new Date(from+'T00:00:00'):new Date(0),td=to?new Date(to+'T23:59:59'):new Date();
    const all=[...(x.entries||[])].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const sign=e=>e.kind==='gave'?Number(e.amount||0):-Number(e.amount||0);
    const opening=all.filter(e=>new Date(e.date)<fd).reduce((s,e)=>s+sign(e),0);
    const period=all.filter(e=>new Date(e.date)>=fd&&new Date(e.date)<=td);
    let run=opening,debit=0,credit=0,debitCount=0,creditCount=0;
    const rows=period.map(e=>{
      const a=Number(e.amount)||0;
      if(e.kind==='gave'){run+=a;debit+=a;debitCount++}else{run-=a;credit+=a;creditCount++}
      return '<tr><td>'+new Date(e.date).toLocaleDateString('en-GB')+'</td><td>'+esc(e.note||'')+'</td><td class="num debit">'+(e.kind==='gave'?money(a):'')+'</td><td class="num credit">'+(e.kind==='got'?money(a):'')+'</td><td class="num">'+money(Math.abs(run))+' <small>'+(run>=0?'You Will Get':'You Will Give')+'</small></td></tr>';
    }).join('');
    const closing=run, owner=root.profile?.name||'TripKhata';
    const w=window.open('','_blank');if(!w)return alert('Popup blocked. Allow popups for PDF report.');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(x.name)+' Statement</title><style>'+
      'body{font-family:Arial,sans-serif;color:#222;margin:0;background:#fff}.page{max-width:900px;margin:0 auto;padding:24px}.head{background:#f4f4f4;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:20px}.head h2,.head h3,.head p{margin:0 0 5px}.right{text-align:right}.muted{color:#727b86;font-size:12px}.big{text-align:center;padding:24px 10px 18px}.big b{display:block;font-size:30px}.big span{display:block;margin-top:7px;font-size:14px}.big small{display:block;margin-top:4px;color:#7c8792}.red,.debit{color:#d63838!important}.green,.credit{color:#2f9b52!important}.totals{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #e2e6eb;border-bottom:1px solid #e2e6eb;background:#fafafa}.totals div{padding:13px;text-align:center;border-right:1px solid #e2e6eb}.totals div:last-child{border-right:0}.totals span,.totals b,.totals small{display:block}.totals span{font-size:12px}.totals b{font-size:18px;margin-top:4px}.totals small{font-size:10px;color:#8a939e;margin-top:3px}.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;min-width:680px}th{background:#f1f3f6;text-align:left}th,td{border-bottom:1px solid #e0e4e9;padding:10px 8px}.num{text-align:right}td small{display:block;color:#8a95a0;font-size:9px;margin-top:2px}.closing{margin-top:18px;border-top:3px solid #222;background:#f5f5f5;padding:16px;text-align:right}.closing b{font-size:19px;margin-left:7px}.closing small{display:block;margin-top:6px;color:#727c88}.foot{display:flex;justify-content:space-between;color:#8a939e;font-size:10px;padding:14px 0}.actions button{padding:11px 14px;border:0;border-radius:8px;background:#1558b0;color:#fff;font-weight:800}@media(max-width:600px){.page{padding:10px}.head{grid-template-columns:1fr;gap:12px}.right{text-align:left}.totals{grid-template-columns:1fr 1fr 1fr}.big b{font-size:26px}}@media print{.actions{display:none}.page{max-width:none;padding:10mm}.head{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
      '</style></head><body><div class="page">'+
      '<div class="head"><div><h2>TripKhata</h2><p class="muted">'+OWNER_EMAIL+'</p></div><div class="right"><div class="muted">Created on: '+new Date(x.createdAt||Date.now()).toLocaleDateString('en-GB')+'</div><span>Customer:</span><h3>'+esc(x.name)+'</h3><p>'+esc(x.phone||'')+'</p>'+(x.address?'<p class="muted">'+esc(x.address)+'</p>':'')+'</div></div>'+
      '<div class="big"><b class="'+(closing>=0?'red':'green')+'">'+money(Math.abs(closing))+'</b><span>Balance | '+(from||'Beginning')+' - '+(to||'Today')+'</span><small>'+(closing>=0?'Total Balance Due from Customer':closing<0?'Advance / You Have To Give':'Account Clear')+'</small></div>'+
      '<div class="totals"><div><span>Opening Balance</span><b>'+money(Math.abs(opening))+'</b><small>'+(opening>=0?'You Will Get':'You Will Give')+'</small></div><div><span class="debit">Debit ('+debitCount+')</span><b class="debit">'+money(debit)+'</b><small>You Gave / Customer owes</small></div><div><span class="credit">Credit ('+creditCount+')</span><b class="credit">'+money(credit)+'</b><small>You Got / Customer paid</small></div></div>'+
      '<div class="tablewrap"><table><thead><tr><th>Date</th><th>Notes / Details</th><th class="num debit">Debit</th><th class="num credit">Credit</th><th class="num">Running Balance</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;padding:25px">No entries in selected period.</td></tr>')+'</tbody></table></div>'+
      '<div class="closing"><span>Current Balance:</span><b class="'+(closing>=0?'red':'green')+'">'+money(Math.abs(closing))+'</b><strong> ('+(closing>=0?'Total Balance Due':'Advance / Payable')+')</strong><small>As of '+(to||new Date().toLocaleDateString('en-GB'))+'</small></div>'+
      '<div class="foot"><span>Generated by TripKhata</span><span>'+OWNER_EMAIL+'</span></div><div class="actions"><button onclick="print()">PDF / Print</button></div></div></body></html>');    w.document.close();
  }
  window.openCustomerStatementV2=showPicker;
  const old=window.kbEntityReport;
  window.kbEntityReport=function(type,id){if(type==='customer')return showPicker(id);return old?old(type,id):null};
  const st=document.createElement('style');st.textContent='.crShade{position:fixed;inset:0;z-index:2000;background:#10233f88;display:flex;align-items:flex-end;justify-content:center}.crSheet{width:min(540px,100%);background:#fff;border-radius:22px 22px 0 0;padding:16px 18px 24px;box-shadow:0 -15px 50px #0002}.crHandle{width:46px;height:5px;background:#d5dce6;border-radius:8px;margin:0 auto 14px}.crTop{display:flex;justify-content:space-between;align-items:flex-start}.crTop b,.crTop span{display:block}.crTop b{font-size:21px}.crTop span{font-size:12px;color:#718096}.crTop button{border:0;background:#f0f4f8;border-radius:10px;padding:8px}.crSheet p{font-size:12px;color:#687689;line-height:1.5}.crGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.crGrid label{font-size:12px;color:#667}.crGrid input{width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border:1px solid #d8e1ec;border-radius:10px}.crQuick{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.crQuick button{border:1px solid #d5e0ee;background:#f7faff;border-radius:9px;padding:8px}.crPrimary{width:100%;margin-top:14px;padding:13px;border:0;border-radius:11px;background:#1558b0;color:#fff;font-weight:900}';document.head.appendChild(st);
})();