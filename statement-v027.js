/* TripKhata v0.2.7 — robust ledger buttons + full trip statement */
(function(){
  function pays(t){return (t.settlements||[]).filter(p=>p.status!=='void')}
  function memberNameFromRow(row,t){
    const txt=(row.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    return t.members.find(m=>txt.includes(m.toLowerCase()))||null;
  }

  window.openMemberLedgerV027=function(name){
    const t=getTrip(); if(!t)return;
    const x=totals(t), rows=[];
    t.expenses.forEach(e=>{
      const share=(e.split||[]).includes(name)?Number(e.amount)/(e.split.length||1):0;
      if(e.payer===name) rows.push({date:e.date,type:'credit',text:'Expense paid: '+e.desc,amount:Number(e.amount)});
      if(share>0) rows.push({date:e.date,type:'debit',text:'Your share: '+e.desc,amount:share});
    });
    pays(t).forEach(p=>{
      if(p.from===name) rows.push({date:p.date,type:'credit',text:'Settlement paid to '+p.to+' • '+p.mode,amount:Number(p.amount)});
      if(p.to===name) rows.push({date:p.date,type:'debit',text:'Settlement received from '+p.from+' • '+p.mode,amount:Number(p.amount)});
    });
    rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const paid=t.expenses.filter(e=>e.payer===name).reduce((s,e)=>s+Number(e.amount),0);
    const share=t.expenses.reduce((s,e)=>s+((e.split||[]).includes(name)?Number(e.amount)/(e.split.length||1):0),0);
    const sent=pays(t).filter(p=>p.from===name).reduce((s,p)=>s+Number(p.amount),0);
    const received=pays(t).filter(p=>p.to===name).reduce((s,p)=>s+Number(p.amount),0);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div><div class="sheettitle">${esc(name)} Ledger / Statement</div><div class="muted small">Complete personal trip history</div></div><div class="grow"></div><button class="iconbtn" onclick="closeModal()">✕</button></div>
      <div class="summary4" style="margin-top:12px">
        <div class="sumcard blue"><div class="sumlabel">Paid Expenses</div><div class="sumvalue" style="font-size:18px">${fmt(t,paid)}</div></div>
        <div class="sumcard pink"><div class="sumlabel">Own Share</div><div class="sumvalue" style="font-size:18px">${fmt(t,share)}</div></div>
        <div class="sumcard green"><div class="sumlabel">Settlement Paid</div><div class="sumvalue" style="font-size:18px">${fmt(t,sent)}</div></div>
        <div class="sumcard gold"><div class="sumlabel">Settlement Received</div><div class="sumvalue" style="font-size:18px">${fmt(t,received)}</div></div>
      </div>
      <div class="card" style="box-shadow:none"><div class="row"><b class="grow">Current Balance</b><b class="${x.bal[name]>=0?'plus':'minus'}" style="font-size:20px">${x.bal[name]>=0?'+':'-'}${fmt(t,Math.abs(x.bal[name]||0))}</b></div></div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Statement Entries</div>
        ${rows.length?rows.map(r=>`<div class="member"><div class="grow"><b>${esc(r.text)}</b><div class="muted tiny">${new Date(r.date).toLocaleString()}</div></div><b class="${r.type==='credit'?'plus':'minus'}">${r.type==='credit'?'+':'-'}${fmt(t,r.amount)}</b></div>`).join(''):'<div class="muted small" style="padding:15px 0">No entries yet.</div>'}
      </div>
    </div></div>`;
  };
  window.openMemberLedger=window.openMemberLedgerV027;

  window.openTripStatement=function(){
    const t=getTrip();if(!t)return;
    const x=totals(t);
    const expenses=[...t.expenses].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const settlements=[...pays(t)].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const cat={}; expenses.forEach(e=>cat[e.category]=(cat[e.category]||0)+Number(e.amount));
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div><div class="sheettitle">${esc(t.name)} — Full Details</div><div class="muted small">Complete trip statement</div></div><div class="grow"></div><button class="iconbtn" onclick="closeModal()">✕</button></div>
      <div class="card" style="box-shadow:none"><div class="muted small">Total Trip Expense</div><div style="font-size:32px;font-weight:950">${fmt(t,x.total)}</div><div class="muted tiny">${t.members.length} members • ${t.expenses.length} expenses</div></div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">All Expenses</div>
      ${expenses.length?expenses.map(e=>`<div class="recent-pro"><div class="recent-cat">${categoryIcon(e.category)}</div><div class="recent-info"><div class="recent-title">${esc(e.desc)}</div><div class="recent-meta">Paid by ${esc(e.payer)} • Split ${e.split.length} • ${new Date(e.date).toLocaleDateString()}</div></div><div class="recent-right"><div class="recent-amt">${fmt(t,e.amount)}</div></div></div>`).join(''):'<div class="muted small">No expenses.</div>'}
      </div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Category Total</div>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="row" style="padding:7px 0"><span>${categoryIcon(c)}</span><div class="grow">${esc(c)}</div><b>${fmt(t,v)}</b></div>`).join('')}</div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Member Summary</div>${t.members.map(m=>`<div class="member"><div class="avatar">${initials(m)}</div><div class="grow"><b>${esc(m)}</b><div class="muted tiny">Paid ${fmt(t,x.paid[m]||0)} • Share ${fmt(t,x.owed[m]||0)}</div></div><b class="${x.bal[m]>=0?'plus':'minus'}">${x.bal[m]>=0?'+':'-'}${fmt(t,Math.abs(x.bal[m]||0))}</b><button class="btn soft" style="padding:7px 9px;margin-left:7px" onclick='openMemberLedgerV027(${JSON.stringify(m)})'>Ledger</button></div>`).join('')}</div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Settlement Payments</div>${settlements.length?settlements.map(p=>`<div class="member"><div class="grow"><b>${esc(p.from)} → ${esc(p.to)}</b><div class="muted tiny">${esc(p.mode)} • ${new Date(p.date).toLocaleString()}</div></div><b>${fmt(t,p.amount)}</b></div>`).join(''):'<div class="muted small" style="padding:12px 0">No settlement payments yet.</div>'}</div>
      <div class="grid2" style="margin-top:12px"><button class="btn primary" onclick="closeModal();renderReports();showPage('reports')">Settle Up</button><button class="btn soft" onclick="closeModal();printEasyReport()">PDF Report</button></div>
    </div></div>`;
  };

  function inject(){
    const t=getTrip(); if(!t)return;
    const home=document.getElementById('page-trip');
    if(home){
      const section=[...home.querySelectorAll('.sectioncard')].find(x=>/Member Balances/i.test(x.textContent||''));
      if(section){
        section.querySelectorAll('.member-pro,.member').forEach(row=>{
          const name=memberNameFromRow(row,t);if(!name)return;
          if(!row.querySelector('.tk-v027-ledger')){
            const b=document.createElement('button');b.className='btn soft tk-v027-ledger';b.textContent='Ledger';b.style.cssText='padding:7px 9px;margin-left:6px;font-size:11px';
            b.onclick=e=>{e.stopPropagation();openMemberLedgerV027(name)};
            const chev=row.querySelector('.chev');if(chev)row.insertBefore(b,chev);else row.appendChild(b);
          }
          row.onclick=e=>{if(!e.target.closest('button'))openMemberLedgerV027(name)};
        });
      }
      if(!document.getElementById('tkFullDetailsBtn')){
        const recent=[...home.querySelectorAll('.sectioncard')].find(x=>/Recent Expenses/i.test(x.textContent||''));
        if(recent){
          const b=document.createElement('button');b.id='tkFullDetailsBtn';b.className='btn dark block';b.style.marginTop='12px';b.textContent='📋 Full Trip Details / Statement';b.onclick=openTripStatement;recent.after(b);
        }
      }
    }
    const members=document.getElementById('page-members');
    if(members){
      members.querySelectorAll('.member').forEach(row=>{
        const name=memberNameFromRow(row,t);if(!name)return;
        if(!row.querySelector('.tk-v027-ledger')){
          const b=document.createElement('button');b.className='btn soft tk-v027-ledger';b.textContent='Ledger';b.style.cssText='padding:7px 9px;margin-left:6px;font-size:11px';b.onclick=e=>{e.stopPropagation();openMemberLedgerV027(name)};row.appendChild(b);
        }
      });
    }
  }
  new MutationObserver(()=>inject()).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(inject,700); setTimeout(inject,100);
})();