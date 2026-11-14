'use strict';

// All data shown here is read-only; receipt archive creation is deliberately not called.
function searchGroups173f(query, data) {
  const match = fields => searchMatches173e(fields, query);
  const invoices = (data.invoices || []).filter(i => match([i.number,i.customer,i.ownerName,i.phone,i.date,i.total,...(i.lines || []).map(x=>x.name)]));
  const transactions = (data.transactions || []).filter(t => !t.ghost && match([t.desc,t.note,t.person,t.seller,t.customer,t.date,t.amount,Number(t.amount)/10]));
  const receipts = (data.receipts || []).map(item => ({...item, parsed:parseReceipt(item.raw || '')})).filter(item => match([item.raw,item.parsed?.name,item.parsed?.date,item.parsed?.amount,Number(item.parsed?.amount)/10]));
  return [
    {key:'invoices',title:'فاکتورها',rows:invoices.filter(i=>i.kind!=='فروش')},
    {key:'sales',title:'فروش‌ها',rows:invoices.filter(i=>i.kind==='فروش')},
    {key:'transactions',title:'تراکنش‌ها',rows:transactions},
    {key:'receipts',title:'رسیدها',rows:receipts},
    {key:'reports',title:'گزارش‌ها',rows:match(['گزارش تراکنش‌ها']) ? [{name:'گزارش تراکنش‌ها'}] : []},
    {key:'contacts',title:'مخاطبین',rows:(data.contacts || []).filter(p=>match([p.name,p.phone,p.note,...(p.phones || [])]))},
    {key:'reminders',title:'یادآورها',rows:(data.reminders || []).filter(r=>match([r.title,r.date,r.name,r.person,r.amount]))}
  ];
}
function invoiceDashboard173e(items) {
  if (!Array.isArray(items)) return '<div class="card mut" role="status">در حال بارگذاری فاکتورها…</div>';
  const valid=items.filter(i=>!i.proforma), total=valid.reduce((n,i)=>n+(Number(i.total)||0),0);
  return '<section class="dashboard-173e"><div class="row"><b>فاکتورها</b><button class="sec" data-invoice-report-173f type="button">گزارش</button></div><div class="dashboard-grid"><div>جمع مبلغ<b>'+total.toLocaleString('fa-IR')+' تومان</b></div></div>'+(!valid.length?'<div class="mut">فاکتوری ثبت نشده</div>':'')+'</section>';
}
function searchRender173e() {
  const box=document.getElementById('search-results-173e'), input=document.getElementById('search-input-173e'); if (!box || !input) return;
  const contacts=load('ppl',[]), receiptRows=[...receiptArchive(),...tx.filter(t=>t.receipt).map(t=>({raw:t.receipt})),...log.filter(x=>x.rc&&x.raw).map(x=>({raw:x.raw})),...rcPending().map(raw=>({raw}))];
  const receipts=[...new Map(receiptRows.filter(r=>r.raw).map(r=>[r.raw.trim().slice(0,1000),r])).values()];
  const groups=searchGroups173f(input.value,{transactions:tx,invoices:invoiceList(),receipts,contacts:Array.isArray(contacts)?contacts:[],reminders:rem});
  box.innerHTML=groups.filter(g=>g.rows.length).map(g=>'<section><div class="mut"><b>'+g.title+' · '+g.rows.length.toLocaleString('fa-IR')+'</b></div>'+g.rows.slice(0,50).map(item=>{
    const i=g.key==='invoices'||g.key==='sales', r=item.parsed, title=i?(item.customer||'بدون نام'):g.key==='receipts'?(r?.name||'رسید'):g.key==='contacts'?(item.name||'مخاطب'):g.key==='reminders'?(item.title||'یادآوری'):(item.desc||item.person||item.name||'تراکنش');
    const date=i?item.date:g.key==='receipts'?r?.date:item.date;
    const amount=i?Number(item.total):g.key==='receipts'?Number(r?.amount)/10:g.key==='transactions'?Number(item.amount)/10:g.key==='reminders'?Number(item.amount):NaN;
    const extra=i?('شماره '+(item.number||'—')+' · '+invoiceStatusLabel170(invoiceStatus170(item,tx))):g.key==='contacts'?(item.phone||''):'';
    const detail=[date,Number.isFinite(amount)?amount.toLocaleString('fa-IR')+' تومان':'',extra,g.title].filter(Boolean).map(esc).join(' · ');
    const id=String(item.id??''); const action=['invoices','sales','transactions','receipts','contacts','reminders','reports'].includes(g.key);
    return '<div class="search-result-173e">'+(action?'<button type="button" data-search-group-173f="'+g.key+'" data-search-id-173f="'+esc(id)+'">':'')+'<b>'+esc(title)+'</b><div class="mut">'+detail+'</div>'+(action?'</button>':'')+'</div>';
  }).join('')+'</section>').join('') || '<div class="card mut">چیزی پیدا نشد</div>';
}
document.addEventListener('click', event=>{
  if(event.target.closest('[data-invoice-report-173f]')) { if(tab!=='report'){tab='report';render();} const ledger=document.querySelector('.invoice-ledger'); if(ledger){ledger.open=true;ledger.scrollIntoView({block:'start'});} return; }
  const button=event.target.closest('[data-search-group-173f]'); if(!button) return;
  const group=button.getAttribute('data-search-group-173f'), id=button.getAttribute('data-search-id-173f');
  document.getElementById('search-panel-173e').hidden=true;
  if(group==='contacts'){topic='expenses';tab='contacts';cv='list';const person=load('ppl',[]).find(p=>String(p.id)===id);pe=person?person.id:null;pEditing=false;render();return;}
  if(group==='reminders'){topic='reminders';tab='home';render();return;}
  if(group==='receipts'){topic='reminders';tab='home';render();const archive=document.getElementById('receipt-archive-search');if(archive){archive.closest('details').open=true;archive.scrollIntoView({block:'center'});}return;}
  if(group==='transactions'||group==='reports'){topic='expenses';tab='report';render();const card=[...document.querySelectorAll('.card[data-id]')].find(x=>x.dataset.id===id);card?.scrollIntoView({block:'center'});return;}
  if(group==='invoices'||group==='sales'){topic=group==='sales'?'sales':'invoices';tab='report';render();const card=[...document.querySelectorAll('.invoice-result[data-invoice-id]')].find(x=>x.dataset.invoiceId===id);if(card){card.open=true;card.scrollIntoView({block:'center'});} }
});
