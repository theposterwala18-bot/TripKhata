/* TripKhata v0.2.6 — guaranteed visible member ledger buttons */
(function(){
  function paymentRows(t){return (t.settlements||[]).filter(p=>p.status!=='void')}
  window.openMemberLedger=function(name){
    const t=getTrip(); if(!t)return;
    const x=totals(t), rows=[];
    t.expenses.slice().reverse().forEach(e=>{
      const share=(e.split||[]).includes(name)?Number(e.amount)/(e.split.length||1):0;
      if(e.payer===name) rows.push({date:e.date,text:'Paid expense: '+e.desc,credit:Number(e.amount),debit:0});
      if(share>0) rows.push({date:e.date,text:'Share: '+e.desc,credit:0,debit:share});
    });
    paymentRows(t).forEach(p=>{
      if(p.from===name) rows.push({date:p.date,text:'Paid to '+p.to+' • '+p.mode,credit:Number(p.amount),debit:0});
      if(p.to===name) rows.push({date:p.date,text:'Received from '+p.from+' • '+p.mode,credit:0,debit:Number(p.amount)});
    });
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div><div class="sheettitle">${esc(name)} Ledger / Statement</div><div class="muted small">Expense + settlement history</div></div><div class="grow"></div><div class="${x.bal[name]>=0?'plus':'minus'} amount">${x.bal[name]>=0?'+':'-'}${fmt(t,Math.abs(x.bal[name]||0))}</div></div>
      <div style="margin-top:12px">${rows.length?rows.map(r=>`<div class="member"><div class="grow"><b>${esc(r.text)}</b><div class="muted tiny">${new Date(r.date).toLocaleString()}</div></div><div style="text-align:right">${r.credit?'<div class="plus">+'+fmt(t,r.credit)+'</div>':''}${r.debit?'<div class="minus">-'+fmt(t,r.debit)+'</div>':''}</div></div>`).join(''):'<div class="muted small" style="padding:18px 0">No ledger entries yet.</div>'}</div>
    </div></div>`;
  };

  function addHomeLedgerButtons(){
    const t=getTrip(); if(!t)return;
    document.querySelectorAll('#page-trip .member-pro').forEach(row=>{
      if(row.querySelector('.tk-ledger-btn'))return;
      const nameEl=row.querySelector('.member-pro-name'); if(!nameEl)return;
      const name=nameEl.textContent.replace(/\s*\(You\)\s*$/,'').trim();
      const btn=document.createElement('button');
      btn.className='btn soft tk-ledger-btn';
      btn.style.cssText='padding:7px 9px;margin-left:6px;font-size:11px';
      btn.textContent='Ledger';
      btn.onclick=(e)=>{e.stopPropagation();openMemberLedger(name)};
      const chev=row.querySelector('.chev');
      if(chev) row.insertBefore(btn,chev); else row.appendChild(btn);
      row.onclick=()=>openMemberLedger(name);
    });
  }

  function enhanceMembers(){
    const t=getTrip(); if(!t)return;
    document.querySelectorAll('#page-members .member').forEach(row=>{
      if(row.querySelector('.tk-ledger-btn'))return;
      const nameEl=row.querySelector('b'); if(!nameEl)return;
      const name=nameEl.textContent.trim();
      const btn=document.createElement('button');
      btn.className='btn soft tk-ledger-btn';
      btn.style.cssText='padding:7px 9px;margin-left:6px;font-size:11px';
      btn.textContent='Ledger';
      btn.onclick=(e)=>{e.stopPropagation();openMemberLedger(name)};
      row.appendChild(btn);
      row.onclick=(e)=>{if(!e.target.closest('button'))openMemberLedger(name)};
    });
  }

  const oldTrip=window.renderTrip;
  window.renderTrip=function(){oldTrip();setTimeout(addHomeLedgerButtons,0)};
  const oldMembers=window.renderMembers;
  window.renderMembers=function(){oldMembers();setTimeout(enhanceMembers,0)};
  setTimeout(()=>{addHomeLedgerButtons();enhanceMembers()},250);
})();