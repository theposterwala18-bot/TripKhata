/* TripKhata v0.4.0 — Trip Fund / Common Wallet */
(function(){
  const V='0.4.0';
  function ensure(t){t.fund=t.fund||{holder:'',contributions:[],transactions:[],targetPerMember:0};return t.fund}
  function activeMembers(t){return t.members.filter(m=>!(t.inactiveMembers||[]).includes(m))}
  function fundCollected(t){const f=ensure(t);return f.contributions.filter(x=>x.status!=='void').reduce((s,x)=>s+Number(x.amount||0),0)}
  function fundSpent(t){const f=ensure(t);return f.transactions.filter(x=>x.status!=='void'&&x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0)}
  function fundBalance(t){return fundCollected(t)-fundSpent(t)}
  function memberFundContrib(t,m){const f=ensure(t);return f.contributions.filter(x=>x.status!=='void'&&x.member===m).reduce((s,x)=>s+Number(x.amount||0),0)}
  function memberFundPending(t,m){const f=ensure(t),target=Number(f.targetPerMember||0);return Math.max(0,target-memberFundContrib(t,m))}
  function fmtM(t,n){return (t.currency||'₹')+Math.round((Number(n)||0)*100)/100}

  const oldCreateTrip=window.createTrip;
  window.createTrip=function(){
    oldCreateTrip();
    const t=getTrip(); if(t&&!t.fund)t.fund={holder:state.user?.name||t.members[0]||'',contributions:[],transactions:[],targetPerMember:0};
    save();
  };

  function openFundDashboard(){
    const t=getTrip();if(!t)return;
    const f=ensure(t),members=activeMembers(t),col=fundCollected(t),spent=fundSpent(t),bal=fundBalance(t);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div><div class="sheettitle">Trip Fund / Common Wallet</div><div class="muted small">Personal payments te common fund dono ikathe chal sakde ne</div></div><div class="grow"></div><button class="iconbtn" onclick="closeModal()">✕</button></div>
      <div class="summary4" style="margin-top:12px">
        <div class="sumcard green"><div class="sumlabel">Collected</div><div class="sumvalue" style="font-size:20px">${fmtM(t,col)}</div></div>
        <div class="sumcard pink"><div class="sumlabel">Spent</div><div class="sumvalue" style="font-size:20px">${fmtM(t,spent)}</div></div>
        <div class="sumcard blue"><div class="sumlabel">Remaining</div><div class="sumvalue" style="font-size:20px">${fmtM(t,bal)}</div></div>
        <div class="sumcard gold"><div class="sumlabel">Fund Holder</div><div class="sumvalue" style="font-size:17px">${esc(f.holder||'Not set')}</div></div>
      </div>
      <div class="grid2" style="margin-top:12px">
        <button class="btn primary" onclick="openFundContribution()">+ Add Contribution</button>
        <button class="btn soft" onclick="openFundSettings()">⚙ Fund Settings</button>
      </div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Member Contributions</div>
        ${members.map(m=>{const c=memberFundContrib(t,m),p=memberFundPending(t,m);return `<div class="member"><div class="avatar">${initials(m)}</div><div class="grow"><b>${esc(m)}</b><div class="muted tiny">Contributed ${fmtM(t,c)}${Number(f.targetPerMember)>0?' • Pending '+fmtM(t,p):''}</div></div><button class="btn soft" style="padding:7px 9px" onclick='openFundContribution(${JSON.stringify(m)})'>Add</button></div>`}).join('')}
      </div>
      <div class="card" style="box-shadow:none"><div class="cardtitle">Fund Activity</div>
        ${[...f.contributions.filter(x=>x.status!=='void').map(x=>({...x,kind:'Contribution'})),...f.transactions.filter(x=>x.status!=='void').map(x=>({...x,kind:'Expense'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(x=>`<div class="member"><div class="grow"><b>${x.kind==='Contribution'?esc(x.member)+' added to fund':esc(x.desc||'Fund expense')}</b><div class="muted tiny">${esc(x.mode||'')} • ${new Date(x.date).toLocaleString()}</div></div><b class="${x.kind==='Contribution'?'plus':'minus'}">${x.kind==='Contribution'?'+':'-'}${fmtM(t,x.amount)}</b></div>`).join('')||'<div class="muted small" style="padding:12px 0">No fund activity yet.</div>'}
      </div>
    </div></div>`;
  }
  window.openFundDashboard=openFundDashboard;

  window.openFundSettings=function(){
    const t=getTrip(),f=ensure(t);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Fund Settings</div>
      <div class="label">Fund Holder / Treasurer</div><select id="fundHolder">${t.members.map(m=>`<option ${m===f.holder?'selected':''}>${esc(m)}</option>`).join('')}</select>
      <div class="label">Target Contribution Per Member (optional)</div><input id="fundTarget" type="number" step="0.01" value="${Number(f.targetPerMember||0)}" placeholder="5000">
      <button class="btn primary block" style="margin-top:14px" onclick="saveFundSettings()">Save</button></div></div>`;
  };
  window.saveFundSettings=function(){
    const t=getTrip(),f=ensure(t);f.holder=fundHolder.value;f.targetPerMember=Number(fundTarget.value||0);save();closeModal();openFundDashboard();toastMsg('Fund settings saved');
  };

  window.openFundContribution=function(member=''){
    const t=getTrip();ensure(t);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Add Fund Contribution</div>
      <div class="label">Member</div><select id="fcMember">${t.members.map(m=>`<option ${m===member?'selected':''}>${esc(m)}</option>`).join('')}</select>
      <div class="label">Amount</div><input id="fcAmount" type="number" step="0.01" placeholder="5000">
      <div class="label">Mode</div><select id="fcMode"><option>Cash</option><option>GPay / UPI</option><option>PhonePe</option><option>Paytm</option><option>Bank Transfer</option><option>Other</option></select>
      <div class="label">Note (optional)</div><input id="fcNote" placeholder="Initial fund / extra contribution">
      <button class="btn primary block" style="margin-top:14px" onclick="saveFundContribution()">Add to Trip Fund</button></div></div>`;
  };
  window.saveFundContribution=function(){
    const t=getTrip(),f=ensure(t),a=Number(fcAmount.value);if(!a)return alert('Valid amount enter karo.');
    f.contributions.push({id:id(),member:fcMember.value,amount:+a.toFixed(2),mode:fcMode.value,note:fcNote.value.trim(),date:new Date().toISOString(),status:'paid'});
    activity(`${fcMember.value} added ${t.currency}${a} to Trip Fund via ${fcMode.value}`);save();closeModal();openFundDashboard();toastMsg('Contribution added');
  };

  window.openFundExpense=function(prefill={}){
    const t=getTrip(),f=ensure(t),bal=fundBalance(t);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Pay from Trip Fund</div>
      <div class="muted small">Available: ${fmtM(t,bal)}</div>
      <div class="label">Expense</div><input id="feDesc" value="${esc(prefill.desc||'')}" placeholder="Hotel / Dinner / Fuel">
      <div class="label">Amount</div><input id="feAmount" type="number" step="0.01" value="${prefill.amount||''}">
      <div class="label">Category</div><select id="feCategory">${['Coffee','Food','Hotel','Fuel','Transport','Toll','Shopping','Medical','Other'].map(c=>`<option ${prefill.category===c?'selected':''}>${c}</option>`).join('')}</select>
      <div class="label">Split among</div><div class="checks">${activeMembers(t).map(m=>`<label class="chip"><input type="checkbox" value="${esc(m)}" checked>${esc(m)}</label>`).join('')}</div>
      <button class="btn primary block" style="margin-top:14px" onclick="saveFundExpense()">Save Fund Expense</button></div></div>`;
  };
  window.saveFundExpense=function(){
    const t=getTrip(),f=ensure(t),a=Number(feAmount.value),split=[...modalRoot.querySelectorAll('.chip input:checked')].map(x=>x.value);if(!a||!split.length)return alert('Amount te split select karo.');
    const bal=fundBalance(t);if(a>bal+0.009&&!confirm('Trip Fund balance '+fmtM(t,bal)+' hai. Expense fund ton vadh aa. Fir vi record karna?'))return;
    f.transactions.push({id:id(),type:'expense',amount:+a.toFixed(2),desc:feDesc.value.trim()||'Fund Expense',category:feCategory.value,split,date:new Date().toISOString(),mode:'Trip Fund',status:'paid'});
    t.expenses.unshift({id:id(),amount:+a.toFixed(2),payer:'Trip Fund',desc:feDesc.value.trim()||'Fund Expense',category:feCategory.value,split:[...split],photo:null,date:new Date().toISOString(),updatedAt:new Date().toISOString(),source:'fund'});
    activity(`Trip Fund paid ${t.currency}${a} for ${feDesc.value.trim()||'expense'}`);save();closeModal();renderTrip();toastMsg('Fund expense added');
  };

  // fund-aware balances: fund contributions count as member money into common pool; fund-paid expenses are already represented in expense shares.
  const baseCalc2=window.calc;
  window.calc=function(t){
    const b=baseCalc2(t),f=ensure(t);
    f.contributions.filter(x=>x.status!=='void').forEach(c=>{b[c.member]=(b[c.member]||0)+Number(c.amount||0)});
    // Common fund holds collected cash. To avoid over-crediting, allocate the fund pool as shared trip money by subtracting each member's equal liability contribution from balance.
    const activeMs=activeMembers(t), collected=fundCollected(t);
    if(activeMs.length&&collected){
      const avg=collected/activeMs.length;
      activeMs.forEach(m=>b[m]=(b[m]||0)-avg);
    }
    Object.keys(b).forEach(k=>{if(Math.abs(b[k])<.005)b[k]=0});
    return b;
  };

  function enhanceDashboard(){
    const t=getTrip();if(!t)return;ensure(t);
    if(!document.getElementById('tkFundCard')){
      const anchor=document.querySelector('.summary4');
      if(anchor){
        const card=document.createElement('div');card.id='tkFundCard';card.className='sectioncard';
        card.innerHTML=`<div class="sectionhead"><div class="sectionicon">💰</div><div><div class="sectiontitle">Trip Fund</div><div class="sectionsub">Common wallet • ${fmtM(t,fundBalance(t))} remaining</div></div><button class="sectionaction" onclick="openFundDashboard()">Open</button></div><div class="row"><div class="grow"><b>${fmtM(t,fundCollected(t))}</b><div class="muted tiny">Collected</div></div><div class="grow"><b>${fmtM(t,fundSpent(t))}</b><div class="muted tiny">Spent</div></div><button class="btn soft" onclick="openFundContribution()">+ Contribution</button><button class="btn primary" onclick="openFundExpense()">Pay from Fund</button></div>`;
        anchor.after(card);
      }
    }
  }

  const oldTrip=window.renderTrip;
  window.renderTrip=function(){oldTrip();setTimeout(enhanceDashboard,0)};
  setInterval(enhanceDashboard,1000);
})();