/* TripKhata v0.4.1 — Fund correction tools (edit/delete) */
(function(){
  function fund(t){
    t.fund=t.fund||{holder:'',contributions:[],transactions:[],targetPerMember:0};
    return t.fund;
  }
  function active(t){return (t.members||[]).filter(m=>!(t.inactiveMembers||[]).includes(m))}
  function collected(t){return fund(t).contributions.filter(x=>x.status!=='void').reduce((s,x)=>s+Number(x.amount||0),0)}
  function spent(t){return fund(t).transactions.filter(x=>x.status!=='void'&&x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0)}
  function balance(t){return collected(t)-spent(t)}
  function money(t,n){return (t.currency||'₹')+(Math.round((Number(n)||0)*100)/100)}
  function linkExpense(t,tx){
    if(!tx)return null;
    if(tx.expenseId){
      const e=(t.expenses||[]).find(v=>v.id===tx.expenseId);
      if(e)return e;
    }
    return (t.expenses||[]).find(e=>e.source==='fund' &&
      Math.abs(Number(e.amount||0)-Number(tx.amount||0))<0.01 &&
      String(e.desc||'')===String(tx.desc||'') &&
      Math.abs(new Date(e.date||0)-new Date(tx.date||0))<5000);
  }

  window.openFundDashboard=function(){
    const t=getTrip();if(!t)return;
    const f=fund(t), col=collected(t), sp=spent(t), bal=balance(t);
    const items=[
      ...f.contributions.filter(x=>x.status!=='void').map(x=>Object.assign({},x,{kind:'Contribution'})),
      ...f.transactions.filter(x=>x.status!=='void').map(x=>Object.assign({},x,{kind:'Expense'}))
    ].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const rows=items.map(x=>{
      const title=x.kind==='Contribution'?esc(x.member)+' added to fund':esc(x.desc||'Fund expense');
      const sign=x.kind==='Contribution'?'+':'-';
      const cls=x.kind==='Contribution'?'plus':'minus';
      return '<div class="member"><div class="grow"><b>'+title+'</b><div class="muted tiny">'+esc(x.mode||'')+' • '+new Date(x.date).toLocaleString()+'</div></div>'+
        '<div style="text-align:right"><b class="'+cls+'">'+sign+money(t,x.amount)+'</b>'+
        '<div style="display:flex;gap:5px;justify-content:flex-end;margin-top:5px">'+
        '<button class="btn soft" style="padding:5px 8px;font-size:11px" onclick="editFundActivity(\''+x.kind+'\',\''+x.id+'\')">Edit</button>'+
        '<button class="btn soft" style="padding:5px 8px;font-size:11px;color:#c93636" onclick="deleteFundActivity(\''+x.kind+'\',\''+x.id+'\')">Delete</button></div></div></div>';
    }).join('') || '<div class="muted small" style="padding:12px 0">No fund activity yet.</div>';
    modalRoot.innerHTML='<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div>'+
      '<div class="row"><div><div class="sheettitle">Trip Fund / Common Wallet</div><div class="muted small">Wrong entry can be edited or deleted safely</div></div><div class="grow"></div><button class="iconbtn" onclick="closeModal()">✕</button></div>'+
      '<div class="summary4" style="margin-top:12px"><div class="sumcard green"><div class="sumlabel">Collected</div><div class="sumvalue" style="font-size:20px">'+money(t,col)+'</div></div>'+
      '<div class="sumcard pink"><div class="sumlabel">Spent</div><div class="sumvalue" style="font-size:20px">'+money(t,sp)+'</div></div>'+
      '<div class="sumcard blue"><div class="sumlabel">Remaining</div><div class="sumvalue" style="font-size:20px">'+money(t,bal)+'</div></div>'+
      '<div class="sumcard gold"><div class="sumlabel">Fund Holder</div><div class="sumvalue" style="font-size:17px">'+esc(f.holder||'Not set')+'</div></div></div>'+
      '<div class="grid2" style="margin-top:12px"><button class="btn primary" onclick="openFundContribution()">+ Add Contribution</button><button class="btn soft" onclick="openFundSettings()">⚙ Fund Settings</button></div>'+
      '<div class="card" style="box-shadow:none"><div class="cardtitle">Fund Activity</div>'+rows+'</div></div></div>';
  };

  window.editFundActivity=function(kind,entryId){
    const t=getTrip(),f=fund(t);if(!t)return;
    if(kind==='Contribution'){
      const x=f.contributions.find(v=>String(v.id)===String(entryId)&&v.status!=='void');if(!x)return;
      modalRoot.innerHTML='<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Edit Fund Contribution</div>'+
        '<div class="label">Member</div><select id="fcMember">'+t.members.map(m=>'<option '+(m===x.member?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select>'+
        '<div class="label">Amount</div><input id="fcAmount" type="number" step="0.01" value="'+Number(x.amount||0)+'">'+
        '<div class="label">Mode</div><select id="fcMode">'+['Cash','GPay / UPI','PhonePe','Paytm','Bank Transfer','Other'].map(m=>'<option '+(m===x.mode?'selected':'')+'>'+m+'</option>').join('')+'</select>'+
        '<div class="label">Note (optional)</div><input id="fcNote" value="'+esc(x.note||'')+'">'+
        '<button class="btn primary block" style="margin-top:14px" onclick="saveFundContributionEdit(\''+entryId+'\')">Save Changes</button></div></div>';
      return;
    }
    const x=f.transactions.find(v=>String(v.id)===String(entryId)&&v.status!=='void');if(!x)return;
    modalRoot.innerHTML='<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="sheet"><div class="handle"></div><div class="sheettitle">Edit Fund Expense</div>'+
      '<div class="muted small">Available before this expense: '+money(t,balance(t)+Number(x.amount||0))+'</div>'+
      '<div class="label">Expense</div><input id="feDesc" value="'+esc(x.desc||'')+'">'+
      '<div class="label">Amount</div><input id="feAmount" type="number" step="0.01" value="'+Number(x.amount||0)+'">'+
      '<div class="label">Category</div><select id="feCategory">'+['Coffee','Food','Hotel','Fuel','Transport','Toll','Shopping','Medical','Other'].map(c=>'<option '+(c===x.category?'selected':'')+'>'+c+'</option>').join('')+'</select>'+
      '<div class="label">Split among</div><div class="checks">'+active(t).map(m=>'<label class="chip"><input type="checkbox" value="'+esc(m)+'" '+((x.split||[]).includes(m)?'checked':'')+'>'+esc(m)+'</label>').join('')+'</div>'+
      '<button class="btn primary block" style="margin-top:14px" onclick="saveFundExpenseEdit(\''+entryId+'\')">Save Changes</button></div></div>';
  };

  window.saveFundContributionEdit=function(entryId){
    const t=getTrip(),f=fund(t),x=f.contributions.find(v=>String(v.id)===String(entryId)&&v.status!=='void'),a=Number(fcAmount.value);
    if(!x||!a)return alert('Valid amount enter karo.');
    x.member=fcMember.value;x.amount=+a.toFixed(2);x.mode=fcMode.value;x.note=fcNote.value.trim();x.updatedAt=new Date().toISOString();
    activity('Fund contribution corrected: '+x.member+' • '+(t.currency||'₹')+a);
    save();closeModal();if(typeof renderTrip==='function')renderTrip();openFundDashboard();window.tkFinalPolish?.();toastMsg('Contribution updated');
  };

  window.saveFundExpenseEdit=function(entryId){
    const t=getTrip(),f=fund(t),x=f.transactions.find(v=>String(v.id)===String(entryId)&&v.status!=='void');
    const a=Number(feAmount.value),split=[...modalRoot.querySelectorAll('.chip input:checked')].map(v=>v.value);
    if(!x||!a||!split.length)return alert('Amount te split select karo.');
    const available=balance(t)+Number(x.amount||0);
    if(a>available+0.009&&!confirm('Trip Fund available '+money(t,available)+' hai. Fir vi save karna?'))return;
    const e=linkExpense(t,x);
    x.amount=+a.toFixed(2);x.desc=feDesc.value.trim()||'Fund Expense';x.category=feCategory.value;x.split=[...split];x.updatedAt=new Date().toISOString();
    if(e){e.amount=x.amount;e.desc=x.desc;e.category=x.category;e.split=[...split];e.updatedAt=x.updatedAt;x.expenseId=e.id;}
    activity('Fund expense corrected: '+(t.currency||'₹')+a+' • '+x.desc);
    save();closeModal();if(typeof renderTrip==='function')renderTrip();openFundDashboard();window.tkFinalPolish?.();toastMsg('Fund expense updated');
  };

  window.deleteFundActivity=function(kind,entryId){
    const t=getTrip(),f=fund(t);if(!t)return;
    const isC=kind==='Contribution';
    const x=(isC?f.contributions:f.transactions).find(v=>String(v.id)===String(entryId)&&v.status!=='void');if(!x)return;
    if(!confirm('Delete this '+(isC?'contribution':'fund expense')+'? Totals will be corrected.'))return;
    if(!isC){
      const e=linkExpense(t,x);
      if(e)t.expenses=(t.expenses||[]).filter(v=>v.id!==e.id);
    }
    x.status='void';x.voidedAt=new Date().toISOString();
    activity('Deleted '+(isC?'fund contribution':'fund expense')+': '+(t.currency||'₹')+Number(x.amount||0));
    save();closeModal();if(typeof renderTrip==='function')renderTrip();openFundDashboard();window.tkFinalPolish?.();toastMsg('Fund entry deleted');
  };

  window.saveFundExpense=function(){
    const t=getTrip(),f=fund(t),a=Number(feAmount.value),split=[...modalRoot.querySelectorAll('.chip input:checked')].map(x=>x.value);
    if(!a||!split.length)return alert('Amount te split select karo.');
    const bal=balance(t);if(a>bal+0.009&&!confirm('Trip Fund balance '+money(t,bal)+' hai. Expense fund ton vadh aa. Fir vi record karna?'))return;
    const txId=id(),expenseId=id(),now=new Date().toISOString(),desc=feDesc.value.trim()||'Fund Expense';
    f.transactions.push({id:txId,expenseId:expenseId,type:'expense',amount:+a.toFixed(2),desc:desc,category:feCategory.value,split:[...split],date:now,mode:'Trip Fund',status:'paid'});
    t.expenses.unshift({id:expenseId,fundTransactionId:txId,amount:+a.toFixed(2),payer:'Trip Fund',desc:desc,category:feCategory.value,split:[...split],photo:null,date:now,updatedAt:now,source:'fund'});
    activity('Trip Fund paid '+(t.currency||'₹')+a+' for '+desc);save();closeModal();renderTrip();toastMsg('Fund expense added');
  };
})();