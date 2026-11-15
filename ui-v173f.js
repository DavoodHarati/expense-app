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
  const transactions = (data.transactions || []).filter(t => (data.includeGhost || !t.ghost) && match([t.desc,t.note,t.person,t.seller,t.customer,t.service,t.bank,t.account,t.date,t.amount,Number(t.amount)/10]));
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
function searchOptions173o(values) {
  return [...new Set(values.filter(v=>v !== null && v !== undefined && String(v).trim()).map(String))].sort((a,b)=>b.localeCompare(a,'fa'));
}
function searchMatchesFilters173o(item, filters, scope, transactions) {
  const date = scope === 'reminders' ? searchReminderDate173j(item) : String(item.date || '');
  if (filters.month && !searchNormalize173e(date).startsWith(searchNormalize173e(filters.month))) return false;
  if (scope === 'invoices' || scope === 'sales') {
    if (scope === 'sales' && invoiceKind(item) !== 'فروش') return false;
    if (filters.kind && !invoiceTypeMatches170(item, filters.kind)) return false;
    if (filters.status && invoiceStatus170(item,transactions) !== filters.status) return false;
  } else if (scope === 'expenses') {
    if (filters.direction && item.type !== filters.direction) return false;
    if (filters.account && String(item.account || '') !== filters.account) return false;
    if (filters.category && String(item.cat || '') !== filters.category) return false;
  } else if (scope === 'work') {
    if (filters.person && String(item.person || '') !== filters.person) return false;
    if (filters.workType && String(item.loan || '') !== filters.workType) return false;
  } else if (scope === 'reminders' && filters.remStatus) {
    if (filters.remStatus === 'done' && !item.done) return false;
    if (filters.remStatus === 'pending' && item.done) return false;
  }
  return true;
}
function searchSetup173o(scope) {
  const names={expenses:['هزینه‌ها','شرح، مبلغ، نام طرف حساب، بانک یا تاریخ'],invoices:['فاکتورها','شماره، مشتری، خدمت، مبلغ یا تاریخ'],sales:['فروش‌ها','شماره، مشتری، کالا، مبلغ یا تاریخ'],work:['کارکردها','نام همکار، شرح کار، مبلغ یا تاریخ'],reminders:['یادآوری‌ها','عنوان، نام، مبلغ یا تاریخ'],receipts:['رسیدها','نام، مبلغ، بانک یا تاریخ']};
  const [title,hint]=names[scope] || ['این بخش','نام، مبلغ یا تاریخ'];
  document.getElementById('search-title-173o').textContent='جست‌وجوی '+title;
  document.getElementById('search-hint-173o').textContent='جست‌وجو در '+hint;
  document.getElementById('search-input-173e').placeholder=hint;
  const invoiceScope=scope==='invoices'||scope==='sales';
  const rows=invoiceScope ? invoiceList().filter(i=>scope!=='sales'||invoiceKind(i)==='فروش') : scope==='work' ? tx.filter(isWage) : scope==='reminders' ? rem : scope==='expenses' ? tx.filter(t=>!t.ghost) : [];
  const option=(value,label)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
  const select=(id,label,options)=>'<label>'+label+'<select id="'+id+'">'+option('','همه')+options+'</select></label>';
  const months=searchOptions173o(rows.map(r=>searchNormalize173e(scope==='reminders'?searchReminderDate173j(r):r.date||'').slice(0,7)).filter(d=>/^\d{4}[\/-]\d{2}$/.test(d)));
  let fields=select('search-month-173o','ماه',months.map(m=>option(m,m.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]))).join(''));
  if(invoiceScope) {
    fields+=select('search-kind-173o','نوع فاکتور',[['service','خدمات'],['sale','فروش'],['expense','هزینه']].map(x=>option(...x)).join(''));
    fields+=select('search-status-173o','وضعیت پرداخت',[['paid','پرداخت‌شده'],['unpaid','نسیه'],['partial','پرداخت بخشی'],['recorded','روش پرداخت ثبت‌شده'],['proforma','پیش‌فاکتور'],['unknown','نامشخص']].map(x=>option(...x)).join(''));
  } else if(scope==='expenses') {
    fields+=select('search-direction-173o','نوع تراکنش',option('debit','برداشت')+option('credit','واریز'));
    fields+=select('search-account-173o','حساب / بانک',searchOptions173o(rows.map(t=>t.account)).map(a=>option(a,accName(a))).join(''));
    fields+=select('search-category-173o','دسته',searchOptions173o(rows.map(t=>t.cat)).map(a=>option(a,a)).join(''));
  } else if(scope==='work') {
    fields+=select('search-person-173o','همکار',searchOptions173o(rows.map(t=>t.person)).map(a=>option(a,a)).join(''));
    fields+=select('search-work-type-173o','نوع کارکرد',option('share','سهم همکار')+option('wage','پرداخت دستمزد'));
  } else if(scope==='reminders') fields+=select('search-rem-status-173o','وضعیت',option('pending','انجام‌نشده')+option('done','انجام‌شده'));
  document.getElementById('search-filters-173o').innerHTML='<div class="search-filter-grid-173o">'+fields+'</div>';
  document.querySelector('.search-filters-173o').open=false;
}
function searchFilters173o() {
  const v=id=>document.getElementById(id)?.value || '';
  return {month:v('search-month-173o'),kind:v('search-kind-173o'),status:v('search-status-173o'),direction:v('search-direction-173o'),account:v('search-account-173o'),category:v('search-category-173o'),person:v('search-person-173o'),workType:v('search-work-type-173o'),remStatus:v('search-rem-status-173o')};
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
  const scope = typeof topic === 'undefined' ? 'expenses' : topic;
  const filters=searchFilters173o(), match=item=>searchMatchesFilters173o(item,filters,scope,tx);
  const scopedTx=(scope==='work'?tx.filter(isWage):tx).filter(match);
  const groups=searchGroups173f(input.value,{transactions:scopedTx,invoices:invoiceList().filter(match),receipts,contacts:Array.isArray(contacts)?contacts:[],reminders:rem.filter(match),includeGhost:scope==='work'}).filter(g => scope === 'invoices' ? ['invoices','sales'].includes(g.key) : scope === 'sales' ? g.key === 'sales' : scope === 'work' || scope === 'expenses' ? g.key === 'transactions' : scope === 'reminders' ? ['reminders','receipts'].includes(g.key) : scope === 'receipts' ? g.key === 'receipts' : true);
  if(scope==='work') { const group=groups.find(g=>g.key==='transactions'); if(group) group.title='کارکردها'; }
  if(scope==='reminders') { const receiptGroup=groups.find(g=>g.key==='receipts'); if(receiptGroup) receiptGroup.rows=receiptGroup.rows.filter(r=>!filters.remStatus && (!filters.month || searchNormalize173e(r.parsed?.date || r.linked?.date || '').startsWith(searchNormalize173e(filters.month)))); }
  searchReceipts173j=groups.find(g=>g.key==='receipts')?.rows || [];
  box.innerHTML=groups.filter(g=>g.rows.length).map(g=>'<section><div class="search-meta-173o"><b>'+g.title+' · '+g.rows.length.toLocaleString('fa-IR')+' مورد</b></div>'+g.rows.map((item,index)=>{
    const i=g.key==='invoices'||g.key==='sales', r=item.parsed, title=i?(item.customer||'بدون نام'):g.key==='receipts'?(r?.name||item.linked?.person||item.linked?.seller||'رسید'):g.key==='contacts'?(item.name||'مخاطب'):g.key==='reminders'?(item.title||'یادآوری'):(item.desc||item.person||item.name||'تراکنش');
    const date=i?item.date:g.key==='receipts'?(r?.date||item.linked?.date):g.key==='reminders'?searchReminderDate173j(item):item.date;
    const amount=i?Number(item.total):g.key==='receipts'?Number(r?.amount ?? item.linked?.amount)/10:g.key==='transactions'?Number(item.amount)/10:g.key==='reminders'?Number(item.amount):NaN;
    const extra=i?('شماره '+(item.number||'—')+' · '+invoiceStatusLabel170(invoiceStatus170(item,tx))):g.key==='transactions'?([item.person,item.account ? accName(item.account) : '',item.cat].filter(Boolean).join(' · ')):g.key==='contacts'?(item.phone||''):'';
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
  const searchScope=topic;
  if(typeof searchClose173o === 'function') searchClose173o(); else document.getElementById('search-panel-173e').hidden=true;
  if(group==='contacts'){topic='expenses';tab='contacts';cv='list';const person=load('ppl',[]).find(p=>String(p.id)===id);pe=person?person.id:null;pEditing=false;render();return;}
  if(group==='reminders'){topic='reminders';tab='home';render();const target=[...document.querySelectorAll('.rdn[data-i]')].find(node=>node.dataset.i===id);if(target){target.closest('div')?.scrollIntoView({block:'center'});target.focus();}return;}
  if(group==='receipts'){const selected=searchReceipts173j[Number(id)];topic='reminders';tab='home';render();const archive=document.getElementById('receipt-archive-search');if(archive && selected){const index=receiptArchiveItems().findIndex(item=>item.raw.trim().slice(0,1000)===selected.raw.trim().slice(0,1000));const target=[...document.querySelectorAll('[data-receipt-index-173j]')].find(node=>Number(node.dataset.receiptIndex173j)===index);archive.closest('details').open=true;if(target){target.open=true;target.scrollIntoView({block:'center'});}}return;}
  if(group==='transactions'||group==='reports'){
    if(searchScope==='work'){const row=tx.find(t=>String(t.id)===id);topic='work';tab='home';lp=row?.person || null;render();const review=[...document.querySelectorAll('.workreview')].find(x=>x.dataset.id===id);if(review) review.click();return;}
    topic='expenses';tab='report';render();const card=[...document.querySelectorAll('.card[data-id]')].find(x=>x.dataset.id===id);card?.scrollIntoView({block:'center'});return;
  }
  if(group==='invoices'||group==='sales'){topic=searchScope==='sales'?'sales':'invoices';tab='report';render();const card=[...document.querySelectorAll('.invoice-result[data-invoice-id]')].find(x=>x.dataset.invoiceId===id);if(card){card.open=true;card.scrollIntoView({block:'center'});} }
});
