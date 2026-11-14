'use strict';
let searchReceipts173j = [];
function searchReminderDate173j(item) {
  const value=String(item.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || typeof fa !== 'function') return value;
  const date=new Date(value+'T12:00:00');
  return Number.isNaN(date.getTime()) ? value : fa(date);
}

// All data shown here is read-only; receipt archive creation is deliberately not called.
function searchGroups173f(query, data) {
  const match = fields => searchMatches173e(fields, query);
  const invoices = (data.invoices || []).filter(i => match([i.number,i.customer,i.ownerName,i.phone,i.date,i.total,...(i.lines || []).map(x=>x.name)]));
  const transactions = (data.transactions || []).filter(t => !t.ghost && match([t.desc,t.note,t.person,t.seller,t.customer,t.date,t.amount,Number(t.amount)/10]));
  const receipts = (data.receipts || []).map(item => ({...item, parsed:parseReceipt(item.raw || '')})).filter(item => match([item.raw,item.parsed?.name,item.parsed?.date,item.parsed?.amount,Number(item.parsed?.amount)/10,item.linked?.person,item.linked?.seller,item.linked?.date,item.linked?.amount]));
  return [
    {key:'invoices',title:'فاکتورها',rows:invoices.filter(i=>i.kind!=='فروش')},
    {key:'sales',title:'فروش‌ها',rows:invoices.filter(i=>i.kind==='فروش')},
    {key:'transactions',title:'تراکنش‌ها',rows:transactions},
    {key:'receipts',title:'رسیدها',rows:receipts},
    {key:'reports',title:'گزارش‌ها',rows:match(['گزارش تراکنش‌ها']) ? [{name:'گزارش تراکنش‌ها'}] : []},
    {key:'contacts',title:'مخاطبین',rows:(data.contacts || []).filter(p=>match([p.name,p.phone,p.note,...(p.phones || [])]))},
    {key:'reminders',title:'یادآورها',rows:(data.reminders || []).filter(r=>match([r.title,r.date,searchReminderDate173j(r),r.name,r.person,r.amount]))}
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
  const receipts=[...new Map(receiptRows.filter(r=>r.raw).map(r=>[r.raw.trim().slice(0,1000),r])).values()].map(item=>({...item,linked:tx.find(t=>t.receipt===item.raw.trim().slice(0,1000))}));
  const groups=searchGroups173f(input.value,{transactions:tx,invoices:invoiceList(),receipts,contacts:Array.isArray(contacts)?contacts:[],reminders:rem});
  searchReceipts173j=groups.find(g=>g.key==='receipts').rows.slice(0,50);
  box.innerHTML=groups.filter(g=>g.rows.length).map(g=>'<section><div class="mut"><b>'+g.title+' · '+g.rows.length.toLocaleString('fa-IR')+'</b></div>'+g.rows.slice(0,50).map((item,index)=>{
    const i=g.key==='invoices'||g.key==='sales', r=item.parsed, title=i?(item.customer||'بدون نام'):g.key==='receipts'?(r?.name||item.linked?.person||item.linked?.seller||'رسید'):g.key==='contacts'?(item.name||'مخاطب'):g.key==='reminders'?(item.title||'یادآوری'):(item.desc||item.person||item.name||'تراکنش');
    const date=i?item.date:g.key==='receipts'?(r?.date||item.linked?.date):g.key==='reminders'?searchReminderDate173j(item):item.date;
    const amount=i?Number(item.total):g.key==='receipts'?Number(r?.amount ?? item.linked?.amount)/10:g.key==='transactions'?Number(item.amount)/10:g.key==='reminders'?Number(item.amount):NaN;
    const extra=i?('شماره '+(item.number||'—')+' · '+invoiceStatusLabel170(invoiceStatus170(item,tx))):g.key==='contacts'?(item.phone||''):'';
    const detail=[date,Number.isFinite(amount)?amount.toLocaleString('fa-IR')+' تومان':'',extra,g.title].filter(Boolean).map(esc).join(' · ');
    const id=g.key==='receipts'?String(index):String(item.id??''); const action=['invoices','sales','transactions','receipts','contacts','reminders','reports'].includes(g.key);
    return '<div class="search-result-173e">'+(action?'<button type="button" data-search-group-173f="'+g.key+'" data-search-id-173f="'+esc(id)+'">':'')+'<b>'+esc(title)+'</b><div class="mut">'+detail+'</div>'+(action?'</button>':'')+'</div>';
  }).join('')+'</section>').join('') || '<div class="card mut">چیزی پیدا نشد</div>';
}
function searchDetail173j(item, group) {
  const box=document.getElementById('search-results-173e'); if(!box || !item) return;
  const receipt=group==='receipts', parsed=receipt?item.parsed:null, title=receipt?(parsed?.name||item.linked?.person||item.linked?.seller||'رسید'):(item.title||'یادآوری');
  const date=receipt?(parsed?.date||item.linked?.date||''):searchReminderDate173j(item), amount=receipt?Number(parsed?.amount??item.linked?.amount)/10:Number(item.amount);
  box.innerHTML='<div class="card"><b>'+esc(title)+'</b><div class="mut">'+esc(date||'تاریخ نامشخص')+(Number.isFinite(amount)?' · '+amount.toLocaleString('fa-IR')+' تومان':'')+'</div>'+(receipt?'<div style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(item.raw||'')+'</div>':'')+'<button type="button" class="sec" data-search-back-173j>بازگشت به نتایج</button></div>';
}
document.addEventListener('click', event=>{
  if(event.target.closest('[data-search-back-173j]')) { searchRender173e(); return; }
  if(event.target.closest('[data-invoice-report-173f]')) { if(tab!=='report'){tab='report';render();} const ledger=document.querySelector('.invoice-ledger'); if(ledger){ledger.open=true;ledger.scrollIntoView({block:'start'});} return; }
  const button=event.target.closest('[data-search-group-173f]'); if(!button) return;
  const group=button.getAttribute('data-search-group-173f'), id=button.getAttribute('data-search-id-173f');
  if(group==='reminders'&&!featureOn('reminder')) { searchDetail173j(rem.find(item=>String(item.id)===id),group); return; }
  if(group==='receipts'&&(!featureOn('reminder')||!featureOn('sms'))) { searchDetail173j(searchReceipts173j[Number(id)],group); return; }
  document.getElementById('search-panel-173e').hidden=true;
  if(group==='contacts'){topic='expenses';tab='contacts';cv='list';const person=load('ppl',[]).find(p=>String(p.id)===id);pe=person?person.id:null;pEditing=false;render();return;}
  if(group==='reminders'){topic='reminders';tab='home';render();const target=[...document.querySelectorAll('.rdn[data-i]')].find(node=>node.dataset.i===id);if(target){target.closest('div')?.scrollIntoView({block:'center'});target.focus();}return;}
  if(group==='receipts'){const selected=searchReceipts173j[Number(id)];topic='reminders';tab='home';render();const archive=document.getElementById('receipt-archive-search');if(archive && selected){const index=receiptArchiveItems().findIndex(item=>item.raw.trim().slice(0,1000)===selected.raw.trim().slice(0,1000));const target=[...document.querySelectorAll('[data-receipt-index-173j]')].find(node=>Number(node.dataset.receiptIndex173j)===index);archive.closest('details').open=true;if(target){target.open=true;target.scrollIntoView({block:'center'});}}return;}
  if(group==='transactions'||group==='reports'){topic='expenses';tab='report';render();const card=[...document.querySelectorAll('.card[data-id]')].find(x=>x.dataset.id===id);card?.scrollIntoView({block:'center'});return;}
  if(group==='invoices'||group==='sales'){topic=group==='sales'?'sales':'invoices';tab='report';render();const card=[...document.querySelectorAll('.invoice-result[data-invoice-id]')].find(x=>x.dataset.invoiceId===id);if(card){card.open=true;card.scrollIntoView({block:'center'});} }
});
