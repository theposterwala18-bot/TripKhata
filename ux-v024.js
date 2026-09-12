/* TripKhata v0.2.4 — @ member autocomplete + ledger click UX */
(function(){
  function removeSuggest(){document.getElementById('tkMentionSuggest')?.remove()}
  function activeMembers(t){return t.members.filter(m=>!(t.inactiveMembers||[]).includes(m))}
  function showSuggest(input){
    const t=getTrip(); if(!t||!input)return removeSuggest();
    const v=input.value, at=v.lastIndexOf('@'); if(at<0)return removeSuggest();
    const tail=v.slice(at+1); if(/\s/.test(tail))return removeSuggest();
    const q=tail.trim().toLowerCase();
    const list=activeMembers(t).filter(m=>!q||m.toLowerCase().startsWith(q)).slice(0,8);
    if(!list.length)return removeSuggest();
    let box=document.getElementById('tkMentionSuggest');
    if(!box){box=document.createElement('div');box.id='tkMentionSuggest';box.style.cssText='position:absolute;left:0;right:0;top:100%;z-index:80;background:#fff;border:1px solid #dbe7f5;border-radius:14px;box-shadow:0 12px 30px rgba(16,24,40,.16);overflow:hidden;margin-top:5px;text-align:left';input.parentElement.style.position='relative';input.parentElement.appendChild(box)}
    box.innerHTML=list.map(m=>`<button type="button" data-name="${esc(m)}" style="width:100%;display:flex;align-items:center;gap:10px;border:0;border-bottom:1px solid #edf2f7;background:#fff;padding:11px 12px;text-align:left"><span class="avatar" style="width:32px;height:32px">${initials(m)}</span><span><b>@${esc(m)}</b><small style="display:block;color:#7386a8">Select member</small></span></button>`).join('');
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const name=b.dataset.name;input.value=v.slice(0,at)+'@'+name+' pay ';input.focus();removeSuggest()});
  }
  document.addEventListener('input',e=>{if(e.target?.id==='quickInput')showSuggest(e.target)});
  document.addEventListener('focusin',e=>{if(e.target?.id==='quickInput')showSuggest(e.target)});
  document.addEventListener('click',e=>{if(!e.target.closest('#tkMentionSuggest')&&e.target?.id!=='quickInput')removeSuggest()});

  const prevRenderTrip=window.renderTrip;
  window.renderTrip=function(){
    prevRenderTrip();
    document.querySelectorAll('#page-trip .member-pro').forEach(row=>{
      const nameEl=row.querySelector('.member-pro-name'); if(!nameEl)return;
      const name=nameEl.textContent.replace(/\s*\(You\)\s*$/,'').trim();
      row.style.cursor='pointer'; row.onclick=(ev)=>{if(ev.target.closest('button'))return;openMemberLedger(name)};
    });
    const settleBtn=[...document.querySelectorAll('#page-trip button')].find(b=>/Settle Up/i.test(b.textContent));
    if(settleBtn) settleBtn.onclick=()=>{renderReports();showPage('reports')};
  };
  const prevMembers=window.renderMembers;
  window.renderMembers=function(){
    prevMembers();
    document.querySelectorAll('#page-members .member').forEach(row=>{
      const b=row.querySelector('b'); if(!b)return; const name=b.textContent.trim();
      row.style.cursor='pointer'; row.onclick=(ev)=>{if(ev.target.closest('button'))return;openMemberLedger(name)};
    });
  };
})();