/* TripKhata v0.2.2 — member edit / safe remove */
(function(){
  function inactive(t,m){return (t.inactiveMembers||[]).includes(m)}
  function activeList(t){return t.members.filter(m=>!inactive(t,m))}

  const oldRenderTrip=window.renderTrip;
  window.renderTrip=function(){
    oldRenderTrip();
    const t=getTrip(); if(!t) return;
    const a=activeList(t);
    if(window.quickSplit && quickSplit.options.length) quickSplit.options[0].textContent='All ('+a.length+')';
    if(window.dashMembers) dashMembers.textContent=a.length;
    if(window.dashMemberCount) dashMemberCount.textContent=a.length;
  };

  const oldCurrentMember=window.currentMember;
  window.currentMember=function(t){
    const n=(state.user?.name||'').trim().toLowerCase();
    const a=activeList(t);
    return a.find(m=>m.toLowerCase()===n)||a[0]||oldCurrentMember(t);
  };

  window.showMembersSheet=function(){
    const t=getTrip(); if(!t) return toastMsg('Open a trip first');
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="row"><div class="sheettitle grow">Members</div><button class="btn soft" onclick="openMemberSheet()">+ Add</button></div>
      ${t.members.map(m=>`<div class="member"><div class="avatar">${initials(m)}</div><div class="grow"><b>${esc(m)}</b>${inactive(t,m)?'<div class="muted tiny">Left trip • old hisab preserved</div>':''}</div><button class="btn soft" style="padding:8px 10px" onclick='openMemberManage(${JSON.stringify(m)})'>⋮</button></div>`).join('')}
    </div></div>`;
  };

  window.openMemberManage=function(name){
    const t=getTrip(), left=inactive(t,name);
    modalRoot.innerHTML=`<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>
      <div class="sheettitle">Manage Member</div>
      <div class="label">Member name</div><input id="editMemberName" value="${esc(name)}">
      <button class="btn primary block" style="margin-top:12px" onclick='renameMember(${JSON.stringify(name)})'>Save Name</button>
      ${left
        ? `<button class="btn soft block" style="margin-top:8px" onclick='reactivateMember(${JSON.stringify(name)})'>Re-activate Member</button>`
        : `<button class="btn danger block" style="margin-top:8px" onclick='removeMember(${JSON.stringify(name)})'>Remove from Trip</button>`}
      <div class="muted tiny" style="margin-top:12px">If this member already has expenses, Remove will mark them as Left so old balances stay safe. If they have no financial record, they can be deleted completely.</div>
    </div></div>`;
  };

  window.renameMember=function(oldName){
    const t=getTrip(), n=editMemberName.value.trim();
    if(!n) return alert('Name cannot be blank.');
    if(n.toLowerCase()!==oldName.toLowerCase() && t.members.some(x=>x.toLowerCase()===n.toLowerCase())) return alert('Eh name already exists.');
    t.members=t.members.map(x=>x===oldName?n:x);
    t.inactiveMembers=(t.inactiveMembers||[]).map(x=>x===oldName?n:x);
    t.expenses.forEach(e=>{ if(e.payer===oldName)e.payer=n; e.split=(e.split||[]).map(x=>x===oldName?n:x); });
    activity(`${oldName} renamed to ${n}`); save(); closeModal(); renderTrip(); toastMsg('Member name updated');
  };

  window.removeMember=function(name){
    const t=getTrip();
    const used=t.expenses.some(e=>e.payer===name||(e.split||[]).includes(name));
    if(used){
      t.inactiveMembers=t.inactiveMembers||[];
      if(!t.inactiveMembers.includes(name))t.inactiveMembers.push(name);
      activity(`${name} left trip; old hisab preserved`);
      save(); closeModal(); renderTrip(); toastMsg('Member marked Left; old hisab safe');
    }else{
      if(!confirm(`Remove ${name} from trip?`))return;
      t.members=t.members.filter(x=>x!==name);
      t.inactiveMembers=(t.inactiveMembers||[]).filter(x=>x!==name);
      activity(`${name} removed from ${t.name}`);
      save(); closeModal(); renderTrip(); toastMsg('Member removed');
    }
  };

  window.reactivateMember=function(name){
    const t=getTrip();
    t.inactiveMembers=(t.inactiveMembers||[]).filter(x=>x!==name);
    activity(`${name} re-activated in ${t.name}`);
    save(); closeModal(); renderTrip(); toastMsg('Member re-activated');
  };

  const oldOpenExpenseSheet=window.openExpenseSheet;
  window.openExpenseSheet=function(eid=null){
    oldOpenExpenseSheet(eid);
    if(eid) return;
    const t=getTrip(); if(!t) return;
    const left=new Set(t.inactiveMembers||[]);
    const payer=document.getElementById('ePayer');
    if(payer) [...payer.options].forEach(o=>{if(left.has(o.value))o.remove()});
    modalRoot.querySelectorAll('.chip').forEach(ch=>{
      const inp=ch.querySelector('input'); if(inp && left.has(inp.value)) ch.remove();
    });
  };

  window.quickAdd=function(){
    if(document.getElementById('quickSplit')?.value==='custom') return openExpenseSheet();
    const p=parseQuick(quickInput.value);
    if(!p?.amount||!p?.payer) return alert('Example: @babli pay 1000 coffee');
    const t=getTrip();
    if(inactive(t,p.payer)) return alert(p.payer+' has left this trip. Re-activate member first.');
    const split=activeList(t);
    t.expenses.unshift({id:id(),amount:p.amount,payer:p.payer,desc:p.desc,category:p.category,split:[...split],photo:null,date:new Date().toISOString(),updatedAt:new Date().toISOString()});
    activity(`${p.payer} added ${t.currency}${p.amount} ${p.desc}`);
    quickInput.value=''; parsePreview.textContent=''; save(); renderTrip(); toastMsg('Expense added');
  };
})();

/* expose member manage controls on the actual Members tab */
(function(){
  window.renderMembers=function(){
    const t=getTrip(), el=document.getElementById('page-members');
    if(!t){el.innerHTML='<div class="card">Open/create a trip first.</div>';return}
    const x=totals(t);
    el.innerHTML=`
      <div class="row">
        <div><div class="cardtitle">${esc(t.name)} Members</div><div class="muted small">${t.members.length} friends</div></div>
        <div class="grow"></div>
        <button class="btn primary" onclick="openMemberSheet()">＋ Add</button>
      </div>
      <div class="card">
        ${t.members.map((m,i)=>`
          <div class="member">
            <div class="avatar">${initials(m)}</div>
            <div class="grow">
              <b>${esc(m)}</b>
              ${(t.inactiveMembers||[]).includes(m)?'<div class="muted tiny">Left trip • old hisab preserved</div>':`<div class="muted tiny">Paid ${fmt(t,x.paid[m])} • Share ${fmt(t,x.owed[m])}</div>`}
            </div>
            <div class="${x.bal[m]>=0?'plus':'minus'} amount">${x.bal[m]>=0?'+':''}${fmt(t,x.bal[m])}</div>
            <button class="iconbtn" style="width:36px;height:36px;margin-left:5px" onclick='openMemberManage(${JSON.stringify(m)})'>⋮</button>
          </div>`).join('')}
      </div>`;
  };
})();