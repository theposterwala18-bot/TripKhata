/* TripKhata v0.2.3 — smart settlement, payment ledger, easy reports */
(function(){
  function payments(t){ t.settlements=t.settlements||[]; return t.settlements; }
  function money(t,n){ return fmt(t,Math.abs(Number(n)||0)); }
  function activeMember(t,m){ return !(t.inactiveMembers||[]).includes(m); }

  const baseTotals=window.totals;
  window.totals=function(t){
    const x=baseTotals(t);
    payments(t).forEach(p=>{
      if(p.status==='void') return;
      x.bal[p.from]=(x.bal[p.from]||0)+Number(p.amount||0);
      x.bal[p.to]=(x.bal[p.to]||0)-Number(p.amount||0);
    });
    return x;
  };

  function cleanBalances(t){
    const x=totals(t), out={};
    t.members.forEach(m=>out[m]=Math.abs(x.bal[m])<0.005?0:x.bal[m]);
    return out;
  }

  window.smartSettlement=function(t,mode='receiver'){
    const b=cleanBalances(t);
    let creditors=Object.entries(b).filter(([,v])=>v>0.005).map(([m,v])=>({m,v}));
    let debtors=Object.entries(b).filter(([,v])=>v<-0.005).map(([m,v])=>({m,v:-v}));
    if(mode==='receiver'){
      creditors.sort((a,b)=>b.v-a.v);
      debtors.sort((a,b)=>b.v-a.v);
    }else{
      creditors.sort((a,b)=>b.v-a.v);
      debtors.sort((a,b)=>b.v-a.v);
    }
    const out=[]; let guard=0;
    while(creditors.length&&debtors.length&&guard++<500){
      const c=creditors[0], d=debtors[0], amt=Math.min(c.v,d.v);
      out.push({from:d.m,to:c.m,amount:+amt.toFixed(2)});
      c.v-=amt; d.v-=amt;
      if(c.v<0.005) creditors.shift();
      if(d.v<0.005) debtors.shift();
      if(mode!=='receiver'){
        creditors.sort((a,b)=>b.v-a.v); debtors.sort((a,b)=>b.v-a.v);
      }
    }
    return out;
  };

  window.openSettlementEntry=function(from='',to='',amount=''){
    const t=getTrip(); if(!t)return;
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="sheettitle">Record Payment</div>
      <div class="muted small" style="margin-top:4px">Settlement payment — trip expense nahi.</div>
      <div class="grid2">
        <div><div class="label">From</div><select id="sFrom">${t.members.map(m=>`<option ${m===from?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
        <div><div class="label">To</div><select id="sTo">${t.members.map(m=>`<option ${m===to?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
      </div>
      <div class="label">Amount</div><input id="sAmount" type="number" inputmode="decimal" step="0.01" value="${amount||''}" placeholder="647.13">
      <div class="label">Payment Mode</div><select id="sMode"><option>Cash</option><option>GPay / UPI</option><option>PhonePe</option><option>Paytm</option><option>Bank Transfer</option><option>Other</option></select>
      <div class="label">Date</div><input id="sDate" type="datetime-local" value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}">
      <div class="label">Reference / Note (optional)</div><input id="sRef" placeholder="UPI ref, cash note, etc.">
      <div class="label">Payment screenshot (optional)</div>
      <div class="photoBox"><input id="sPhoto" type="file" accept="image/*" capture="environment" onchange="settlementPhotoPreview(this)" style="border:0;padding:0;background:transparent"><div class="muted tiny">Screenshot/photo attach kar sakde ho</div><img id="sPhotoPreview" class="photoPreview hidden"></div>
      <button class="btn primary block" style="margin-top:16px" onclick="saveSettlement()">Mark as Paid</button>
    </div></div>`;
  };

  let pendingSettlementPhoto=null;
  window.settlementPhotoPreview=function(inp){
    const f=inp.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>{pendingSettlementPhoto=r.result;sPhotoPreview.src=pendingSettlementPhoto;sPhotoPreview.classList.remove('hidden')}; r.readAsDataURL(f);
  };

  window.saveSettlement=function(){
    const t=getTrip(), from=sFrom.value, to=sTo.value, amount=Number(sAmount.value);
    if(from===to)return alert('From te To same member nahi ho sakde.');
    if(!amount||amount<=0)return alert('Valid amount enter karo.');
    const before=cleanBalances(t), due=Math.max(0,-(before[from]||0)), recv=Math.max(0,before[to]||0);
    if(amount>due+0.011 || amount>recv+0.011){
      if(!confirm('Amount current suggested balance ton vadh aa. Fir vi save karna?'))return;
    }
    payments(t).push({id:id(),from,to,amount:+amount.toFixed(2),mode:sMode.value,date:new Date(sDate.value||Date.now()).toISOString(),ref:sRef.value.trim(),photo:pendingSettlementPhoto||null,status:'paid',createdAt:new Date().toISOString()});
    pendingSettlementPhoto=null;
    activity(`${from} paid ${fmt(t,amount)} to ${to} via ${sMode.value}`);
    save(); closeModal(); renderTrip(); renderReports(); toastMsg('Payment recorded');
  };

  window.voidSettlement=function(pid){
    const t=getTrip(), p=payments(t).find(x=>x.id===pid); if(!p)return;
    if(!confirm(`Undo ${p.from} → ${p.to} ${fmt(t,p.amount)} payment?`))return;
    p.status='void'; p.voidedAt=new Date().toISOString();
    activity(`Settlement undone: ${p.from} → ${p.to} ${fmt(t,p.amount)}`);
    save(); renderReports(); renderTrip(); toastMsg('Payment undone');
  };

  window.openMemberLedger=function(name){
    const t=getTrip(); if(!t)return;
    const x=totals(t), rows=[];
    t.expenses.slice().reverse().forEach(e=>{
      const share=(e.split||[]).includes(name)?Number(e.amount)/(e.split.length||1):0;
      if(e.payer===name) rows.push({date:e.date,text:`Paid expense: ${e.desc}`,credit:Number(e.amount),debit:0});
      if(share>0) rows.push({date:e.date,text:`Share: ${e.desc}`,credit:0,debit:share});
    });
    payments(t).filter(p=>p.status!=='void').forEach(p=>{
      if(p.from===name) rows.push({date:p.date,text:`Paid to ${p.to} • ${p.mode}`,credit:Number(p.amount),debit:0});
      if(p.to===name) rows.push({date:p.date,text:`Received from ${p.from} • ${p.mode}`,credit:0,debit:Number(p.amount)});
    });
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div><div class="sheettitle">${esc(name)} Ledger</div><div class="muted small">Complete trip hisab</div></div><div class="grow"></div><div class="${x.bal[name]>=0?'plus':'minus'} amount">${x.bal[name]>=0?'+':'-'}${money(t,x.bal[name])}</div></div>
      <div style="margin-top:12px">${rows.length?rows.map(r=>`<div class="member"><div class="grow"><b>${esc(r.text)}</b><div class="muted tiny">${new Date(r.date).toLocaleString()}</div></div><div style="text-align:right">${r.credit?'<div class="plus">+'+fmt(t,r.credit)+'</div>':''}${r.debit?'<div class="minus">-'+fmt(t,r.debit)+'</div>':''}</div></div>`).join(''):'<div class="muted small">No ledger entries yet.</div>'}</div>
    </div></div>`;
  };

  function suggestedHTML(t){
    const suggestions=smartSettlement(t,'receiver');
    if(!suggestions.length) return '<div class="badge">✓ Trip Fully Settled</div>';
    let currentTo=null, html='';
    suggestions.forEach((s,i)=>{
      if(s.to!==currentTo){
        currentTo=s.to;
        const bal=totals(t).bal[s.to];
        html+=`<div style="margin-top:${i?16:8}px;padding:10px 11px;border-radius:13px;background:#eef6ff"><b>First clear ${esc(s.to)}</b><div class="muted tiny">${fmt(t,bal)} still to receive</div></div>`;
      }
      html+=`<div class="member"><div class="avatar">₹</div><div class="grow"><b>${esc(s.from)} → ${esc(s.to)}</b><div class="muted tiny">Suggested payment</div></div><b>${fmt(t,s.amount)}</b><button class="btn primary" style="padding:8px 10px;margin-left:7px" onclick='openSettlementEntry(${JSON.stringify(s.from)},${JSON.stringify(s.to)},${JSON.stringify(s.amount)})'>Pay</button></div>`;
    });
    return html;
  }

  window.renderReports=function(){
    const t=getTrip(), el=document.getElementById('page-reports');
    if(!t){el.innerHTML='<div class="card">Open/create a trip first.</div>';return}
    const x=totals(t), by={}; t.expenses.forEach(e=>by[e.category]=(by[e.category]||0)+Number(e.amount));
    const ps=payments(t).filter(p=>p.status!=='void').slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
    el.innerHTML=`
      <div class="row"><div><div class="cardtitle">Settle Up</div><div class="muted small">Easy order — pehla ik receiver clear, fer next</div></div><div class="grow"></div><button class="btn soft" onclick="openSettlementEntry()">+ Payment</button></div>
      <div class="card"><div class="cardtitle">Smart Payment Plan</div><div class="muted tiny" style="margin-top:3px">App current balances de hisab naal suggestion update kardi rahegi.</div>${suggestedHTML(t)}</div>
      <div class="card"><div class="row"><div><div class="cardtitle">Member Balances</div><div class="muted tiny">Tap Ledger for full history</div></div></div>${t.members.map(m=>`<div class="member"><div class="avatar">${initials(m)}</div><div class="grow"><b>${esc(m)}</b></div><div class="${x.bal[m]>=0?'plus':'minus'} amount">${x.bal[m]>=0?'+':'-'}${money(t,x.bal[m])}</div><button class="btn soft" style="padding:7px 9px;margin-left:7px" onclick='openMemberLedger(${JSON.stringify(m)})'>Ledger</button></div>`).join('')}</div>
      <div class="card"><div class="row"><div class="cardtitle grow">Payment History</div></div>${ps.length?ps.map(p=>`<div class="member"><div class="avatar">✓</div><div class="grow"><b>${esc(p.from)} → ${esc(p.to)}</b><div class="muted tiny">${esc(p.mode)} • ${new Date(p.date).toLocaleString()}${p.ref?' • '+esc(p.ref):''}</div></div><b>${fmt(t,p.amount)}</b><button class="iconbtn" style="width:34px;height:34px" onclick="voidSettlement(${p.id})">↶</button></div>`).join(''):'<div class="muted small" style="padding-top:12px">No settlement payment recorded yet.</div>'}</div>
      <div class="card"><div class="cardtitle">Trip Expense Summary</div><div style="font-size:30px;font-weight:950;margin:5px 0 10px">${fmt(t,x.total)}</div>${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="row" style="padding:6px 0"><span>${categoryIcon(c)}</span><div class="grow">${c}</div><b>${fmt(t,v)}</b></div>`).join('')}</div>
      <div class="grid2" style="margin-top:14px"><button class="btn primary" onclick="shareEasyReport()">WhatsApp / Share</button><button class="btn soft" onclick="printEasyReport()">PDF / Print</button></div>
    `;
  };

  window.easyReportText=function(){
    const t=getTrip(), x=totals(t), suggestions=smartSettlement(t,'receiver'), ps=payments(t).filter(p=>p.status!=='void');
    let s=`🧳 *TripKhata — ${t.name}*\n\n💰 *Total Trip Expense:* ${fmt(t,x.total)}\n👥 *Members:* ${t.members.length}\n\n*CURRENT BALANCE*\n`;
    t.members.forEach(m=>{
      const b=x.bal[m]||0;
      s+=`• ${m}: ${b>0?'LENA '+fmt(t,b):b<0?'DENA '+fmt(t,-b):'CLEAR ✅'}\n`;
    });
    s+='\n*WHO SHOULD PAY WHOM*\n';
    if(!suggestions.length)s+='✅ Sabh da hisab clear hai.\n';
    else{
      let to=null;
      suggestions.forEach(p=>{ if(p.to!==to){to=p.to;s+=`\n➡️ Pehla *${p.to}* nu clear karo:\n`;} s+=`   ${p.from} → ${p.to}: *${fmt(t,p.amount)}*\n`; });
    }
    s+='\n*PAYMENTS ALREADY DONE*\n';
    if(!ps.length)s+='• Hale koi settlement payment record nahi.\n';
    else ps.forEach(p=>s+=`• ${p.from} → ${p.to}: ${fmt(t,p.amount)} via ${p.mode} (${new Date(p.date).toLocaleDateString()})\n`);
    s+='\n_Generated by TripKhata_';
    return s;
  };

  window.shareEasyReport=function(){
    const t=getTrip(), text=easyReportText();
    if(navigator.share) navigator.share({title:'TripKhata — '+t.name,text}).catch(()=>{});
    else if(navigator.clipboard){navigator.clipboard.writeText(text);toastMsg('Report copied — WhatsApp te paste karo')}
    else prompt('Copy report:',text);
  };

  window.printEasyReport=function(){
    const t=getTrip(), x=totals(t), suggestions=smartSettlement(t,'receiver'), ps=payments(t).filter(p=>p.status!=='void');
    const rows=t.members.map(m=>{const b=x.bal[m]||0;return `<tr><td>${esc(m)}</td><td>${b>0?'To Receive':b<0?'To Pay':'Clear'}</td><td>${b===0?'₹0':fmt(t,Math.abs(b))}</td></tr>`}).join('');
    let groups='',to=null;
    suggestions.forEach(p=>{if(p.to!==to){to=p.to;groups+=`<h3>Clear ${esc(p.to)} first</h3>`;}groups+=`<div class="pay"><span>${esc(p.from)} → ${esc(p.to)}</span><b>${fmt(t,p.amount)}</b></div>`;});
    const hist=ps.length?ps.map(p=>`<div class="pay"><span>${esc(p.from)} → ${esc(p.to)}<small>${esc(p.mode)} • ${new Date(p.date).toLocaleDateString()}</small></span><b>${fmt(t,p.amount)}</b></div>`).join(''):'<p>No settlement payments recorded yet.</p>';
    const w=window.open('','_blank');
    w.document.write(`<!doctype html><meta name="viewport" content="width=device-width"><title>TripKhata Report</title><style>body{font-family:Arial,sans-serif;color:#102147;max-width:760px;margin:30px auto;padding:0 20px}h1{margin-bottom:0}.muted{color:#667085}.hero{background:#eef6ff;padding:18px;border-radius:16px;margin:18px 0}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{text-align:left;padding:11px;border-bottom:1px solid #e5e7eb}.pay{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.pay small{display:block;color:#667085;margin-top:3px}.ok{padding:14px;background:#ecfdf3;border-radius:12px;color:#067647}@media print{button{display:none}body{margin:0}}</style><h1>TripKhata</h1><div class="muted">${esc(t.name)} • Easy Settlement Report</div><div class="hero"><b>Total Trip Expense</b><div style="font-size:30px;font-weight:800">${fmt(t,x.total)}</div><div>${t.members.length} members</div></div><h2>Current Balance</h2><table><tr><th>Member</th><th>Status</th><th>Amount</th></tr>${rows}</table><h2>Who Pays Whom</h2>${suggestions.length?groups:'<div class="ok">✅ Sabh da hisab clear hai.</div>'}<h2>Payments Already Done</h2>${hist}<p class="muted" style="margin-top:30px">Generated by TripKhata</p><button onclick="print()" style="padding:12px 18px">Print / Save as PDF</button>`);
    w.document.close();
  };

  const prevRenderTrip=window.renderTrip;
  window.renderTrip=function(){
    prevRenderTrip();
    document.querySelectorAll('#page-trip .member-pro').forEach((row,i)=>{
      const t=getTrip(), m=t?.members?.[i]; if(!m)return;
      row.style.cursor='pointer'; row.onclick=()=>openMemberLedger(m);
    });
  };
})();