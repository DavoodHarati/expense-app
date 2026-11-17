'use strict';

function invoiceDigits(value) {
  const text = String(value ?? '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[,٬\s]/g, '');
  if (!/^\d+$/.test(text)) return null;
  const result = Number(text);
  return Number.isSafeInteger(result) ? result : null;
}
function invoiceDate(daysAgo = 0) {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.now() - daysAgo * 86400000));
  const get = type => parts.find(part => part.type === type).value;
  return get('year') + '/' + get('month') + '/' + get('day');
}
function persianDateFields(id, initial = invoiceDate(), inputClass = '') {
  const today = invoiceDate(), [year, month, day] = (initial || today).split('/').map(Number), currentYear = Number(today.slice(0, 4));
  const options = (start, end, selected) => Array.from({ length: end - start + 1 }, (_, index) => { const value = start + index; return `<option value="${value}"${value === selected ? ' selected' : ''}>${value.toLocaleString('fa-IR', { useGrouping: false })}</option>`; }).join('');
  return `<label class="mut" for="${id}">تاریخ شمسی</label><input id="${id}" class="${inputClass} persian-date-input" inputmode="numeric" value="${esc(initial)}" placeholder="1405/08/15"><div class="row" dir="rtl" data-date-target="${id}"><select data-date-part="day" aria-label="روز شمسی">${options(1,31,day)}</select><select data-date-part="month" aria-label="ماه شمسی">${options(1,12,month)}</select><select data-date-part="year" aria-label="سال شمسی">${options(Math.min(currentYear-20,year),Math.max(currentYear+10,year),year)}</select></div><div class="row"><button type="button" class="sec work-day" data-target="${id}" data-days="0">امروز</button><button type="button" class="sec work-day" data-target="${id}" data-days="1">دیروز</button><button type="button" class="sec work-day" data-target="${id}" data-days="2">پریروز</button></div>`;
}
function persianToIso(text) {
  const normalized = String(text).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const match = normalized.match(/^(1[34]\d{2})\/(\d{1,2})\/(\d{1,2})$/); if (!match) return '';
  const year = +match[1], month = +match[2], day = +match[3]; if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  const formatter = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const start = Date.UTC(year + 621, 2, 18, 12);
  for (let offset = 0; offset < 370; offset++) { const date = new Date(start + offset * 86400000), parts = formatter.formatToParts(date), part = type => Number(parts.find(p => p.type === type).value); if (part('year') === year && part('month') === month && part('day') === day) return date.toISOString().slice(0, 10); }
  return '';
}
function isoToPersian(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const date = new Date(iso + 'T12:00:00Z'); if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date), part = type => parts.find(p => p.type === type).value;
  return part('year') + '/' + part('month') + '/' + part('day');
}
function syncPersianDate(input) {
  const group = document.querySelector('[data-date-target="' + input.id + '"]');
  const value = input.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const match = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!group || !match) return;
  for (const [part, number] of [['year',match[1]],['month',match[2]],['day',match[3]]]) { const select = group.querySelector('[data-date-part="' + part + '"]'); if ([...select.options].some(option => option.value === String(Number(number)))) select.value = String(Number(number)); }
}
document.addEventListener('change', event => {
  const group = event.target.closest('[data-date-target]');
  if (group && event.target.dataset.datePart) {
    const value = part => group.querySelector('[data-date-part="' + part + '"]').value;
    const input = document.getElementById(group.dataset.dateTarget); input.value = value('year') + '/' + value('month').padStart(2,'0') + '/' + value('day').padStart(2,'0'); input.dispatchEvent(new Event('input', { bubbles:true }));
  } else if (event.target.matches('.persian-date-input')) syncPersianDate(event.target);
});
function invoiceAmountInput(input) {
  const numeric = invoiceDigits(input.value);
  if (input.value && numeric !== null) {
    const digitsBefore = String(input.value.slice(0, input.selectionStart ?? input.value.length)).replace(/[^0-9۰-۹٠-٩]/g, '').length;
    input.value = numeric.toLocaleString('en-US');
    let cursor = 0, count = 0;
    while (cursor < input.value.length && count < digitsBefore) { if (/\d/.test(input.value[cursor])) count++; cursor++; }
    input.setSelectionRange(cursor, cursor);
  }
}
function invoiceList() { const list = load('invoices', []); return Array.isArray(list) ? list : []; }
function invoiceCatalog() { const list = load('invoiceCatalog', []); return Array.isArray(list) ? list : []; }
function invoiceOptions(items) { return [...new Set(items.filter(item => typeof item === 'string' && item.trim()))].map(item => `<option value="${esc(item)}">`).join(''); }
function invoiceSelectOptions(items) { return [...new Set(items.filter(item => typeof item === 'string' && item.trim()))].map(item => `<option value="${esc(item)}">${esc(item)}</option>`).join(''); }
function invoiceSaveData(key, value) { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('dirty', '1'); if (key === 'invoices' && typeof invoiceRefreshReport === 'function') invoiceRefreshReport(); }
function invoiceLineHtml() {
  return `<div class="invoice-line" style="border-top:1px solid #e5e7eb;padding-top:8px"><select class="inv-service-choice"><option value="">انتخاب خدمت یا کالا از فهرست</option>${invoiceSelectOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</select><input class="inv-item" list="invoice-items" placeholder="نام خدمت یا کالا"><div class="row"><label style="flex:0 0 75px">تعداد<input class="inv-qty" inputmode="numeric" value="1" aria-label="تعداد"></label><label style="flex:1">مبلغ واحد (تومان)<input class="inv-price" inputmode="numeric" placeholder="مبلغ به تومان"></label></div><div class="mut inventory-line-total" aria-live="polite"></div><div class="row"><button type="button" class="sec inv-save-item">ذخیره نام و قیمت در فهرست</button><button type="button" class="sec inv-remove-item">حذف ردیف</button></div></div>`;
}
function invoiceKind(item) { return item.kind === 'inventory_purchase' ? 'inventory_purchase' : ['خدمات', 'خدمات دائمی', 'فروش', 'هزینه'].includes(item.kind) ? item.kind : 'خدمات'; }
function invoiceKindLabel(item) { return invoiceKind(item) === 'inventory_purchase' ? INVENTORY_TEXT_FA.purchaseKind : invoiceKind(item); }
function invoiceTypeMatches170(item, type) {
  const kind = invoiceKind(item);
  return !type || type === 'all' || (type === 'inventory_purchase' && kind === 'inventory_purchase') || (type === 'service' && (kind === 'خدمات' || kind === 'خدمات دائمی')) || (type === 'sale' && kind === 'فروش') || (type === 'expense' && kind === 'هزینه');
}
function invoiceStatus170(item, transactions) {
  const payment = invoicePaymentStatus(item, transactions);
  if (item.proforma) return 'proforma';
  if (payment.status === 'paid') return 'paid';
  if (payment.status === 'partial') return 'partial';
  if (item.payment?.method === 'unpaid') return 'unpaid';
  if (['cash', 'transfer', 'pos'].includes(item.payment?.method)) return 'recorded';
  return 'unknown';
}
function invoiceStatusLabel170(state) {
  return ({ proforma:'پیش‌فاکتور', paid:'پرداخت‌شده', partial:'پرداخت بخشی', unpaid:'نسیه', recorded:'روش پرداخت ثبت‌شده', unknown:'نامشخص' })[state] || 'نامشخص';
}
function invoiceOwnerFixedPercent170(base, amount) {
  if (!Number.isSafeInteger(base) || base <= 0 || !Number.isSafeInteger(amount) || amount < 0 || amount > base) throw new Error('مبلغ سهم باید بین صفر و مبلغ پس از کسر لوازم باشد');
  return amount * 100 / base;
}
function invoiceOwnerSync170(total) {
  const mode = document.getElementById('inv-owner-mode-170')?.value;
  if (mode === 'none') document.getElementById('inv-owner-percent').value = '0';
  if (mode !== 'fixed') return;
  const materials = invoiceDigits(document.getElementById('inv-materials').value || '0');
  const fixed = invoiceDigits(document.getElementById('inv-owner-fixed-170').value);
  if (materials === null || fixed === null) throw new Error('مبلغ سهم و لوازم را وارد کن');
  const base = total - materials, exact = Number(invoiceOwnerFixedPercent170(base, fixed).toFixed(12));
  if (Math.round(base * exact / 100) !== fixed) throw new Error('این مبلغ به درصد دقیق قابل تبدیل نیست؛ سهم را به صورت درصد وارد کن');
  document.getElementById('inv-owner-percent').value = String(exact);
}
function invoiceKindColor(item) { return ({inventory_purchase:'#b45309','خدمات':'#16845b', 'خدمات دائمی':'#8249ad', 'فروش':'#2563c3', 'هزینه':'#c64b82'})[invoiceKind(item)]; }
function invoicePaymentStatus(item, transactions) {
  const payments = transactions.filter(t => String(t.invoicePaymentId || '') === String(item.id) && !t.ghost && t.type === 'credit');
  const amount = payments.reduce((sum, t) => sum + (Number(t.amount) || 0) / 10, 0);
  return { payments, amount, status: payments.length ? (amount >= Number(item.total || 0) ? 'paid' : 'partial') : 'unpaid' };
}
function invoiceIsUnpaid173k(item, transactions) {
  return invoiceKind(item) !== 'inventory_purchase' && item.payment?.method === 'unpaid' && invoicePaymentStatus(item, transactions).status !== 'paid';
}
function invoiceWorkRegistered173m(item, transactions) {
  const paymentIds = new Set(transactions.filter(t => !t.ghost && t.type === 'credit' && String(t.invoicePaymentId || '') === String(item.id)).map(t => String(t.id)));
  const matches = transactions.filter(t => t.ghost === true && t.loan === 'share' && t.person === item.assistant && (String(t.invoiceId || '') === String(item.id) || (t.parent != null && paymentIds.has(String(t.parent)))));
  return matches.length === 1 && Number(item.share) > 0 && Number(matches[0].amount) === Number(item.share) * 10;
}
function invoiceMatchesFilters(item, transactions, filters) {
  const state = invoicePaymentStatus(item, transactions), kinds = filters.kinds || [], states = filters.states || [];
  return (!kinds.length || kinds.includes(invoiceKind(item))) && (!states.length || states.some(x => x === 'with' ? state.payments.length > 0 : x === 'without' ? !state.payments.length : x === 'partial' ? state.status === 'partial' : x === 'unpaid' ? item.payment?.method === 'unpaid' && state.status !== 'paid' : false));
}
function invoiceSetPaymentLink(transaction, invoiceId) {
  if (!transaction || transaction.ghost || transaction.type !== 'credit') throw new Error('فقط تراکنش واریزی واقعی را می‌توان سنجاق کرد.');
  if (invoiceId && transaction.invoicePaymentId && transaction.invoicePaymentId !== invoiceId) throw new Error('این تراکنش به فاکتور دیگری سنجاق شده است.');
  if (invoiceId) transaction.invoicePaymentId = invoiceId; else delete transaction.invoicePaymentId;
}
function invoiceDepositSuggestions178(item, rows, rejected = []) {
  if (!item || item.kind === 'inventory_purchase' || rows.some(t => !t.ghost && String(t.invoicePaymentId || '') === String(item.id))) return [];
  const total = Number(item.total) * 10;
  if (!Number.isSafeInteger(total) || total <= 0) return [];
  const normalize = s => String(s || '').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim().toLowerCase();
  const names = [item.customer,item.ownerName].map(normalize).filter(n => n.length >= 3);
  return rows.filter(t => !t.ghost && t.type === 'credit' && !t.invoicePaymentId && !rejected.includes(String(item.id)+'|'+String(t.id)))
    .map(t => { const amount=Number(t.amount), exact=amount===total, text=normalize([t.desc,t.customer,t.seller,t.raw].join(' ')), name=names.some(n=>text.includes(n)); return {t,exact,name,delta:Math.abs(amount-total)}; })
    .filter(x=>x.exact || (x.name && x.delta <= total * .05))
    .sort((a,b)=>Number(b.name)-Number(a.name) || Number(b.exact)-Number(a.exact) || a.delta-b.delta).slice(0,3);
}
function invoiceSharePlan178(item, transaction, rows) {
  if (!item || !transaction || Number(transaction.amount) !== Number(item.total) * 10) return {kind:'skip', reason:'مبلغ واریز با کل فاکتور برابر نیست؛ سهم‌ها خودکار یکسان نمی‌شوند.'};
  if (rows.some(t=>t !== transaction && !t.ghost && String(t.invoicePaymentId||'')===String(item.id))) return {kind:'skip',reason:'فاکتور چند واریز دارد؛ سهم‌ها خودکار تغییر نکردند.'};
  if (rows.some(r=>r.ghost && r.loan==='share' && ((r.invoiceId && String(r.invoiceId)===String(item.id)) || (r.parent != null && String(r.parent)===String(transaction.id))))) return {kind:'skip',reason:'کارکرد ثبت‌شده وجود دارد؛ برای جلوگیری از تغییر یا تکرار، سهم‌ها خودکار تغییر نکردند.'};
  const a = item.assistant && Number(item.share)>0 ? {name:item.assistant,mode:item.shareMode || 'fixed',value:item.shareValue,amount:Number(item.share)*10} : null;
  const b = transaction.colleague && Number(transaction.shareAmount)>0 ? {name:transaction.colleague,mode:transaction.shareMode || 'percent',value:transaction.shareMode==='fixed'? Number(transaction.shareAmount)/10 : Number(transaction.pct),amount:Number(transaction.shareAmount)} : null;
  if (!a && !b) return {kind:'none'};
  if (a && b && a.name===b.name && a.amount===b.amount && a.mode===b.mode && (a.mode!=='percent' || Number(a.value)===Number(b.value))) return {kind:'none'};
  return {kind:a && b?'conflict':a?'invoice':'transaction',invoice:a,transaction:b};
}
function invoicePinWithShare178(item, transaction) {
  const list=invoiceList(), target=list.find(i=>String(i.id)===String(item.id));
  if (!target) throw new Error('فاکتور پیدا نشد.');
  if (!transaction || transaction.ghost || transaction.type!=='credit' || (transaction.invoicePaymentId && String(transaction.invoicePaymentId)!==String(item.id))) throw new Error('این واریز قابل سنجاق به فاکتور نیست.');
  const plan=invoiceSharePlan178(target,transaction,tx); let source=plan.kind, note='';
  if (plan.kind==='conflict') {
    const answer=prompt('سهم دستیار متفاوت است. برای استفاده از سهم فاکتور عدد ۱ و برای استفاده از سهم تراکنش عدد ۲ را وارد کن. برای ادامه بدون تغییر سهم، انصراف را بزن.');
    if (answer==='۱' || answer==='1') source='invoice'; else if(answer==='۲' || answer==='2') source='transaction'; else source='none';
  } else if (plan.kind==='invoice' || plan.kind==='transaction') {
    if (!confirm('سهم دستیار فقط در '+(plan.kind==='invoice'?'فاکتور':'تراکنش')+' ثبت شده است. سهم به طرف دیگر هم منتقل شود؟')) source='none';
  } else if(plan.kind==='skip') note=plan.reason;
  let updatedInvoice=null, updatedTransaction=null;
  if(source==='invoice') {
    const a=plan.invoice;
    if(!Number.isSafeInteger(a.amount) || a.amount<=0 || a.amount>Number(transaction.amount) || (a.mode==='percent' && (!(Number(a.value)>0) || Number(a.value)>100))) note='سهم فاکتور معتبر نیست؛ سهم خودکار کپی نشد.';
    else updatedTransaction={colleague:a.name,shareMode:a.mode,pct:a.mode==='percent'?Number(a.value):0,shareAmount:a.amount};
  }
  if(source==='transaction') {
    const b=plan.transaction;
    if(target.accounting?.status==='confirmed' && !confirm('تغییر سهم، تأیید قبلی فاکتور را به حالت انتظار برمی‌گرداند. ادامه شود؟')) source='none';
    if(source==='transaction') {
      const share=b.amount/10;
      if(!Number.isSafeInteger(share)) note='مبلغ سهم به تومان کامل نیست؛ سهم خودکار کپی نشد.';
      else {
        const accounting=target.accounting ? {...invoiceAccount(Number(target.total),String(target.accounting.materials ?? 0),String(target.accounting.ownerPercent ?? 100),share),status:'pending'} : target.accounting;
        updatedInvoice={assistant:b.name,share:share,shareMode:b.mode,shareValue:String(b.value),accounting};
      }
    }
  }
  if(updatedInvoice) { Object.assign(target,updatedInvoice); invoiceSaveData('invoices',list); }
  if(updatedTransaction) Object.assign(transaction,updatedTransaction);
  invoiceSetPaymentLink(transaction,item.id); save();
  return note;
}
// Display a historical percent only when the linked payment proves the same
// assistant and amount. No invoice or transaction is changed by this lookup.
function invoiceDisplayPercent177(item, transactions) {
  if (item.shareMode === 'percent' && item.shareValue !== '' && item.shareValue != null && Number.isFinite(Number(item.shareValue))) return Number(item.shareValue);
  if (item.shareMode === 'fixed' && item.shareValue !== '' && item.shareValue != null) return null;
  const linked = transactions.filter(t => !t.ghost && String(t.invoicePaymentId || '') === String(item.id));
  if (linked.length !== 1) return null;
  const t = linked[0];
  if (!item.assistant || t.colleague !== item.assistant || t.shareMode !== 'percent' || !Number.isFinite(Number(t.pct)) || Number(t.pct) <= 0) return null;
  if (!Number.isSafeInteger(Number(t.shareAmount)) || Number(t.shareAmount) !== Number(item.share) * 10) return null;
  return Number(t.pct);
}
// Only an explicit payment link can join an invoice to a bank transaction.
function shareParent173i(rows, invoiceId) {
  if (!invoiceId) return null;
  const found = rows.filter(r => !r.ghost && r.type === 'credit' && String(r.invoicePaymentId || '') === String(invoiceId));
  if (found.length > 1) throw new Error('چند واریز به این فاکتور سنجاق شده؛ سهم‌ها را ابتدا جداگانه بررسی کن.');
  return found[0] || null;
}
function shareCandidates173i(rows, parent, invoiceId, person) {
  const linked = invoiceId ? shareParent173i(rows, invoiceId) : null;
  if (parent && linked && String(parent.id) !== String(linked.id)) throw new Error('واریز این فاکتور مشخص نیست؛ ابتدا سنجاق‌ها را بررسی کن.');
  const p = parent || linked;
  return rows.filter(r => r.ghost === true && r.loan === 'share' && (!r.invoiceRowType || r.invoiceRowType === 'assistant_work') && !r.receipt && !r.invoicePaymentId && r.person === person && ((p && r.parent != null && String(r.parent) === String(p.id)) || (invoiceId && r.invoiceId != null && String(r.invoiceId) === String(invoiceId))));
}
function shareDuplicateGroups173i(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (row.ghost !== true || row.loan !== 'share' || (row.invoiceRowType && row.invoiceRowType !== 'assistant_work') || row.receipt || row.invoicePaymentId || !row.person || row.id == null) continue;
    let parent = row.parent != null ? rows.find(r => !r.ghost && String(r.id) === String(row.parent)) : null;
    let invoiceId = row.invoiceId || parent?.invoicePaymentId || '';
    if (invoiceId) { try { const linked = shareParent173i(rows, invoiceId); if (parent && linked && String(parent.id) !== String(linked.id)) continue; parent = parent || linked; } catch (_) { continue; } }
    const identity = parent ? 'parent:' + String(parent.id) : invoiceId ? 'invoice:' + String(invoiceId) : '';
    if (!identity) continue;
    const key = JSON.stringify([identity, row.person, Number(row.amount)]);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row);
  }
  return [...groups.values()].filter(g => g.length > 1).map(g => g.slice().sort((a,b) => Number(b.parent != null) - Number(a.parent != null) || String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id))));
}
function invoiceUpsertWork173i(item, rows, now) {
  const parent = shareParent173i(rows, item.id), matches = shareCandidates173i(rows, parent, item.id, item.assistant);
  if (matches.length > 1) throw new Error('چند ردیف سهم وجود دارد؛ ابتدا تکراری‌ها را در کارکردها بررسی کن.');
  if (parent && parent.colleague && parent.colleague !== item.assistant) throw new Error('دستیار فاکتور و تراکنش متفاوت است؛ پیش از ثبت کارکرد، هر دو را بررسی کن.');
  if (parent && item.shareMode === 'percent' && Number(parent.amount) !== Number(item.total) * 10) throw new Error('مبلغ واریز با کل فاکتور برابر نیست؛ درصد کارکرد را جداگانه بررسی کن.');
  if (parent && parent.colleague && parent.shareMode === 'percent' && item.shareMode === 'percent' && Number(parent.pct) !== Number(item.shareValue)) throw new Error('درصد دستیار در فاکتور و تراکنش متفاوت است؛ پیش از ثبت کارکرد، درصد درست را بررسی کن.');
  if (rows.some(r => r.ghost === true && r.loan === 'share' && r.person !== item.assistant && ((r.invoiceId && String(r.invoiceId) === String(item.id)) || (parent && r.parent != null && String(r.parent) === String(parent.id))))) throw new Error('برای این فاکتور یا واریز، کارکردی با نام دستیار دیگر ثبت شده است؛ ابتدا آن را بررسی کن.');
  const source = parent || rows.find(entry => entry.account) || {}, existing = matches[0];
  const updated = { invoiceId:item.id, invoiceRowType:'assistant_work', ghost:true, bank:source.bank || '', account:source.account || '', type:'credit', amount:item.share * 10, balance:null, date:item.date + ' ' + now.slice(11), cat:'کارکرد همکار', loan:'share', person:item.assistant, desc:'فاکتور ' + item.number + (item.customer ? ' · ' + item.customer : ''), pending:false };
  if (parent) updated.parent = parent.id;
  if (existing) Object.assign(existing, updated); else rows.push({ id:Date.now() + Math.random(), ...updated });
  if (parent && parent.colleague === item.assistant) { parent.shareAmount = item.share * 10; if (item.shareMode === 'percent' && Number(item.shareValue) > 0) { parent.shareMode = 'percent'; parent.pct = Number(item.shareValue); } else { parent.shareMode = 'fixed'; parent.pct = 0; } }
  return existing ? 'updated' : 'created';
}
// Only program-generated, non-bank rows are eligible for automatic revision.
function invoiceRowType172(row) {
  if (!row || !row.invoiceId || !row.ghost || row.invoicePaymentId || row.receipt) return '';
  if (['assistant_work','assistant_share','income'].includes(row.invoiceRowType)) return row.invoiceRowType;
  return row.loan === 'share' && row.type === 'credit' ? 'assistant_work' : '';
}
function invoiceRows172(item, transactions) {
  return transactions.filter(row => String(row.invoiceId || '') === String(item.id) && invoiceRowType172(row));
}
function invoiceDuplicates172(transactions) {
  const groups = new Map();
  for (const row of transactions) {
    const type = invoiceRowType172(row); if (!type) continue;
    const key = JSON.stringify([String(row.invoiceId),type]);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row);
  }
  return [...groups.values()].filter(rows => rows.length > 1);
}
function invoiceUpdateRows172(item, transactions) {
  const rows = invoiceRows172(item, transactions), kinds = [...new Set(rows.map(invoiceRowType172))], changes = [];
  for (const kind of kinds) {
    const group = rows.filter(row => invoiceRowType172(row) === kind), primary = group.filter(row => row.invoicePrimary172 === true);
    if (group.length > 1 && primary.length !== 1) throw new Error('ردیف تکراری پیدا شد؛ ابتدا ردیف اصلی را در بررسی تکراری‌ها مشخص کن.');
    const row = group.length === 1 ? group[0] : primary[0], amount = kind === 'income' ? Number(item.total) : Number(item.share);
    if ((kind === 'assistant_work' || kind === 'assistant_share') && !item.assistant) throw new Error('ردیف دستیار وجود دارد ولی دستیار فاکتور مشخص نیست؛ ابتدا بررسی کن.');
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(amount * 10)) throw new Error('مبلغ ردیف فاکتور معتبر نیست.');
    const parent = row.parent != null ? transactions.find(entry => !entry.ghost && String(entry.id) === String(row.parent)) : null;
    if (kind === 'assistant_work' && parent && parent.colleague === item.assistant && Number(parent.shareAmount) > 0 && Number(parent.shareAmount) !== amount * 10) throw new Error('سهم ثبت‌شده روی واریز با سهم فاکتور فرق دارد؛ ابتدا مبلغ فاکتور را با واریز یکسان کن.');
    changes.push({ row, kind, amount });
  }
  for (const change of changes) {
    change.row.amount = change.amount * 10;
    change.row.invoiceRowType = change.kind;
    if (change.kind !== 'income') change.row.person = item.assistant;
    if (item.date) change.row.date = item.date + (String(change.row.date || '').match(/\s+\d{1,2}:\d{2}/)?.[0] || '');
  }
  return changes.length;
}
function invoicePaymentLabel(method) { return ({unpaid:'نسیه / پرداخت نشده',cash:'نقدی',transfer:'کارت به کارت',pos:'کارت‌خوان'})[method] || 'ثبت نشده'; }
function invoiceHtml() {
  const contacts = load('ppl', []), peopleList = Array.isArray(contacts) ? contacts : [], assistants = [...new Set([...Object.keys(cols()),...peopleList.filter(p=>(p.tags||[]).some(tag=>tag==='همکار'||tag==='دستیار')).map(p=>p.name).filter(Boolean)])];
  return `<details class="card" id="invoice-card"><summary><b>🧾 ثبت و جست‌وجوی فاکتور</b></summary>
    <div id="invoice-form-fields"><div class="mut">ثبت فاکتور به‌تنهایی پرداخت بانکی یا کارکرد دستیار ثبت نمی‌کند.</div>
    <div class="row"><input id="inv-number" placeholder="شماره فاکتور (اختیاری)"><input id="inv-date" inputmode="numeric" value="${invoiceDate()}" placeholder="تاریخ 1405/08/17"></div>
    <style>.inv-sec174{border:1px solid #cfe3de;border-radius:14px;padding:0 12px;margin:10px 0;background:#f7fbfa}.inv-sec174>summary{min-height:54px}.inv-sec174>summary b{color:#0f766e;font-size:16px} .inv-sec174 select,.inv-sec174 button{min-height:44px} .inv-manual-176{margin-top:8px} .inv-manual-176 summary{color:#52635f;font-size:13px}.inv-sum174{display:block;flex:1 1 100%;color:#52635f;font-size:13px}.inv-sec174[open]{padding-bottom:12px}#inv-newc-174{position:fixed;inset:0;background:#0007;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}#inv-newc-174[hidden]{display:none}#inv-newc-174 .box{background:#fff;border-radius:16px;padding:16px;width:100%;max-width:360px}</style><div id="inv-newc-174" hidden><div class="box"><b>مخاطب جدید</b><input id="inv-nc-name" placeholder="نام"><input id="inv-nc-family" placeholder="نام خانوادگی"><input id="inv-nc-phone" inputmode="tel" placeholder="شماره تماس"><select id="inv-nc-group">${['مشتری','راننده','همکار','دستیار','فروشنده','تأمین‌کننده','صاحب خودرو'].map(t=>`<option>${t}</option>`).join('')}</select><div class="row"><button type="button" id="inv-nc-ok">افزودن مخاطب</button><button type="button" class="sec" id="inv-nc-cancel">انصراف</button></div></div></div><div class="mut">انتخاب تاریخ شمسی:</div><div class="row" dir="rtl"><select id="inv-jday" aria-label="روز شمسی"></select><select id="inv-jmonth" aria-label="ماه شمسی"></select><select id="inv-jyear" aria-label="سال شمسی"></select></div>
    <div class="row"><button type="button" class="sec inv-day" data-days="0">امروز</button><button type="button" class="sec inv-day" data-days="1">دیروز</button><button type="button" class="sec inv-day" data-days="2">پریروز</button></div>
    <details class="inv-sec174"><summary><b>👤 راننده / خریدار</b><small id="inv-sum-cust" class="inv-sum174">انتخاب نشده</small></summary><button type="button" class="sec" id="inv-newc-cust">＋ مخاطب جدید</button><select id="inv-contact-group"><option value="">انتخاب گروه</option>${[...new Set(['مشتری','راننده','همکار','دستیار','تأمین‌کننده',...peopleList.flatMap(person => Array.isArray(person.tags) ? person.tags : [])])].map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('')}<option value="__untagged">بدون گروه</option></select><select id="inv-contact" disabled><option value="">&#1575;&#1576;&#1578;&#1583;&#1575; &#1711;&#1585;&#1608;&#1607; &#1585;&#1575; &#1575;&#1606;&#1578;&#1582;&#1575;&#1576; &#1705;&#1606;</option></select><button type="button" class="sec" id="inv-contact-cancel" hidden>بازگشت و ورود دستی</button><details class="inv-manual-176"><summary>&#1608;&#1740;&#1585;&#1575;&#1740;&#1588; &#1583;&#1587;&#1578;&#1740;</summary><label>گروه شخص فاکتور<select id="inv-person-role"><option>مشتری</option><option>راننده</option><option>همکار</option><option>دستیار</option><option>فروشنده</option><option>تأمین‌کننده</option><option>صاحب خودرو</option><option>سایر</option></select></label><input id="inv-customer" placeholder="نام راننده یا خریدار"><input id="inv-phone" inputmode="tel" placeholder="شماره تماس راننده یا خریدار"></details></details><div data-feature-section="vehicle"><div id="inv-owner-fields"><details class="inv-sec174"><summary><b>🔑 صاحب خودرو</b><small id="inv-sum-owner" class="inv-sum174">اختیاری</small></summary><button type="button" class="sec" id="inv-newc-owner">＋ مخاطب جدید</button><select id="inv-owner-group"><option value="">انتخاب گروه</option>${['مشتری','راننده','همکار','دستیار','فروشنده','تأمین‌کننده','صاحب خودرو'].map(tag=>`<option>${tag}</option>`).join('')}</select><select id="inv-owner-contact" disabled><option value="">انتخاب شخص</option></select><details class="inv-manual-176"><summary>&#1608;&#1740;&#1585;&#1575;&#1740;&#1588; &#1583;&#1587;&#1578;&#1740;</summary><input id="inv-owner-name" placeholder="نام و نام خانوادگی صاحب خودرو"><input id="inv-owner-phone" inputmode="tel" placeholder="شماره تماس صاحب خودرو"></details></details></div></div>
    <details class="inv-sec174" data-feature-section="vehicle"><summary><b>🚘 خودرو</b><small id="inv-sum-car" class="inv-sum174">انتخاب نشده</small></summary><select id="inv-car"><option value="">انتخاب خودروی مخاطب (اختیاری)</option></select>
    <select class="inv-car-choice" data-target="inv-car-type"><option value="">انتخاب نوع خودرو</option>${invoiceSelectOptions(load('carTypes', []))}</select><input id="inv-car-type" placeholder="نوع خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-model"><option value="">انتخاب مدل خودرو</option>${invoiceSelectOptions(carModels())}</select><input id="inv-model" placeholder="مدل خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-color"><option value="">انتخاب رنگ خودرو</option>${invoiceSelectOptions(load('carColors', []))}</select><input id="inv-color" placeholder="رنگ خودرو (یا ورود دستی)"><label class="mut">پلاک (برای خودرو سنگین حرف ع را انتخاب کن)</label><div class="row" dir="ltr"><input id="inv-plate-left" inputmode="numeric" maxlength="2" placeholder="دو رقم" aria-label="دو رقم پلاک"><select id="inv-plate-letter" aria-label="حرف پلاک"><option value="">حرف</option>${'ابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی'.split('').map(c => `<option>${c}</option>`).join('')}</select><input id="inv-plate-mid" inputmode="numeric" maxlength="3" placeholder="سه رقم" aria-label="سه رقم پلاک"><input id="inv-plate-iran" inputmode="numeric" maxlength="2" placeholder="ایران" aria-label="کد ایران"></div><input id="inv-plate" placeholder="پلاک کامل (یا ورود دستی)"><div class="mut">فهرست مدل، رنگ و نوع خودرو در تنظیمات ← برچسب‌ها قابل ویرایش است.</div></details>
    <label><input id="inv-proforma" type="checkbox" style="width:auto"> پیش‌فاکتور (فقط نشانگر)</label><select id="inv-kind"><option value="خدمات">خدمات</option><option value="خدمات دائمی">خدمات دائمی</option><option value="فروش">فروش کالا</option><option value="هزینه">هزینه</option></select>
    <datalist id="invoice-items">${invoiceOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</datalist>
    <details class="inv-sec174"><summary><b>🧾 خدمات و کالاها</b></summary><div id="invoice-lines">${invoiceLineHtml()}</div><button type="button" id="inv-add-line" class="sec">＋ افزودن خدمت یا کالا</button></details>
    <div id="inv-total" style="margin:10px 0;font-weight:bold">جمع: ۰ تومان</div>
    <details class="inv-sec174"><summary><b>💳 نحوه تسویه</b></summary><select id="inv-payment"><option value="">روش تسویه مشخص نشده</option><option value="unpaid">نسیه / پرداخت نشده</option><option value="cash">نقدی</option><option value="transfer">کارت به کارت</option><option value="pos">کارت‌خوان</option></select><select id="inv-pay-group"><option value="">گروه دریافت‌کننده</option>${['مشتری','راننده','همکار','دستیار','تأمین‌کننده','سایر'].map(tag=>`<option>${tag}</option>`).join('')}</select><select id="inv-pay-contact"><option value="">انتخاب دریافت‌کننده از مخاطبان (اختیاری)</option>${peopleList.map((person,index) => `<option value="${index}">${esc(person.name || '')}</option>`).join('')}</select><input id="inv-pay-name" placeholder="نام صاحب کارت یا دریافت‌کننده"><input id="inv-pay-card" inputmode="numeric" placeholder="شماره کارت یا حساب (اختیاری)"><input id="inv-pay-note" placeholder="توضیحات تسویه، کارت‌خوان یا پیگیری"><div class="mut">این بخش روش پرداخت را در فاکتور ثبت می‌کند؛ خودکار مانده بانکی یا حساب مخاطب را تغییر نمی‌دهد.</div></details>
    <details class="inv-sec174" data-feature-section="assistant"><summary><b>🤝 سهم دستیار / همکار</b></summary><select id="inv-assistant"><option value="">بدون دستیار</option>${assistants.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select>
    <select id="inv-share-mode"><option value="percent">سهم درصدی</option><option value="fixed">مبلغ ثابت به تومان</option></select><input id="inv-share" inputmode="decimal" placeholder="درصد یا مبلغ سهم دستیار"><div id="inv-share-result" class="mut"></div></details>
    <details class="inv-sec174"><summary><b>🧮 حساب فاکتور</b></summary><div class="mut">ابتدا هزینه لوازم کم می‌شود؛ سهم تو از باقی‌مانده حساب و سهم دستیار از آن کم می‌شود.</div><label>هزینه لوازم (تومان)<input id="inv-materials" inputmode="numeric" placeholder="۰"></label><label>درصد سهم من<input id="inv-owner-percent" inputmode="decimal" value="100" placeholder="درصد سهم من"></label><div id="inv-account-result" class="mut" aria-live="polite"></div></details>
    <div class="row"><button type="button" id="inv-save">ذخیره فاکتور</button><button type="button" class="sec" id="inv-cancel">انصراف و بستن فرم</button></div></div><div id="inv-message" class="mut" aria-live="polite"></div>
    <details id="invoice-search-panel"><summary><b>🔎 جست‌وجو و بررسی فاکتورها</b></summary><input id="inv-search" placeholder="جست‌وجوی نام، خدمت، پلاک یا شماره فاکتور"><select id="inv-filter" aria-label="نوع یا وضعیت فاکتور"><option value="all">همه فاکتورها</option><option value="service">فاکتورهای خدمات</option><option value="sale">فاکتورهای فروش</option><option value="unpaid">فاکتورهای نسیه</option><option value="pending">تأییدنشده‌ها</option><option value="confirmed">تأییدشده‌ها</option></select><div class="mut">فیلترهای چندانتخابی:</div><div id="inv-multi-filters"><div>پرداخت: <label><input type="checkbox" data-state="with" style="width:auto"> با واریز</label> <label><input type="checkbox" data-state="without" style="width:auto"> بدون واریز</label> <label><input type="checkbox" data-state="unpaid" style="width:auto"> نسیه</label> <label><input type="checkbox" data-state="partial" style="width:auto"> پرداخت بخشی</label> </div><div>نوع: <label><input type="checkbox" data-kind="خدمات" style="width:auto"> خدمات</label> <label><input type="checkbox" data-kind="خدمات دائمی" style="width:auto"> خدمات دائمی</label> <label><input type="checkbox" data-kind="فروش" style="width:auto"> فروش</label> <label><input type="checkbox" data-kind="هزینه" style="width:auto"> هزینه</label> </div></div><label style="display:flex;align-items:center;gap:8px"><input id="inv-show-all" type="checkbox" style="width:auto"> نمایش همه نتایج</label><div id="inv-results"></div></details></details>`;
}
function invoiceAccount(total, materialInput, percentInput, share) {
  const materials = materialInput === '' ? 0 : invoiceDigits(materialInput);
  const normalized = String(percentInput).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٫/g, '.').trim();
  if (materials === null || !Number.isSafeInteger(materials) || materials > total) throw new Error('هزینه لوازم باید بین صفر و مبلغ فاکتور باشد');
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || Number(normalized) > 100) throw new Error('درصد سهم من باید بین صفر و ۱۰۰ باشد');
  const ownerPercent = Number(normalized), ownerGross = Math.round((total - materials) * ownerPercent / 100), ownerNet = ownerGross - share;
  if (!Number.isSafeInteger(ownerGross) || !Number.isSafeInteger(ownerNet) || ownerNet < 0) throw new Error('سهم دستیار از سهم محاسبه‌شده تو بیشتر است');
  return { materials, ownerPercent, ownerGross, ownerNet };
}
function invoiceAnalytics170(list, from = '', to = '', type = 'all') {
  const rows = list.filter(i => invoiceKind(i) !== 'inventory_purchase' && i.accounting?.status === 'confirmed' && !i.proforma && invoiceTypeMatches170(i, type) && (!from || String(i.date || '') >= from) && (!to || String(i.date || '') <= to));
  const income = rows.filter(i => invoiceKind(i) !== 'هزینه').reduce((n,i) => n + (Number(i.total) || 0), 0);
  const expenses = rows.reduce((n,i) => n + (invoiceKind(i) === 'هزینه' ? Number(i.total) || 0 : (Number(i.accounting?.materials) || 0) + (Number(i.share) || 0)), 0);
  const profit = rows.reduce((n,i) => n + (invoiceKind(i) === 'هزینه' ? -(Number(i.total) || 0) : Number(i.accounting?.ownerNet) || 0), 0);
  const debt = rows.filter(i => i.payment?.method === 'unpaid').reduce((n,i) => n + Math.max(0, (Number(i.total) || 0) - invoicePaymentStatus(i,tx).amount), 0);
  const months = new Map(), customers = new Map();
  rows.forEach(i => { const amount = Number(i.total) || 0, month = String(i.date || '').slice(0,7); if (month) months.set(month,(months.get(month) || 0) + amount); if (i.customer && invoiceKind(i) !== 'هزینه') customers.set(i.customer,(customers.get(i.customer) || 0) + amount); });
  const max = Math.max(1,...months.values()), fmt = x => x.toLocaleString('fa-IR') + ' تومان';
  return '<div class="invoice-overview-170">' + [['درآمد',income],['هزینه',expenses],['سود / سهم خالص',profit],['مانده نسیه',debt]].map(([name,value]) => '<div>' + name + '<b>' + fmt(value) + '</b></div>').join('') + '</div><div class="mut">فقط فاکتورهای تأییدشده؛ پیش‌فاکتورها محاسبه نمی‌شوند. سود برابر سهم نهایی پس از لوازم و دستیار، منهای فاکتورهای هزینه است.</div><b>جمع ماهانه فاکتورها</b>' + ([...months].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,amount]) => '<div class="mut">' + esc(month) + ' · ' + fmt(amount) + '<div class="invoice-bar-170"><span style="width:' + Math.min(100,amount/max*100) + '%"></span></div></div>').join('') || '<div class="mut">اطلاعاتی نیست.</div>') + '<b>برترین مشتری‌ها</b>' + ([...customers].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,amount]) => '<div class="row mut"><span>' + esc(name) + '</span><b>' + fmt(amount) + '</b></div>').join('') || '<div class="mut">اطلاعاتی نیست.</div>');
}
function invoiceLedgerHtml(list = invoiceList()) {
  const confirmed = list.filter(item => invoiceKind(item) !== 'inventory_purchase' && item.accounting?.status === 'confirmed');
  const unpaid = list.filter(item => invoiceKind(item) !== 'inventory_purchase' && invoiceIsUnpaid173k(item, tx));
  const sum = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0).toLocaleString('fa-IR');
  const customers = new Map(), services = new Map();
  for (const item of confirmed) {
    if (item.customer) customers.set(item.customer, (customers.get(item.customer) || 0) + (Number(item.total) || 0));
    for (const line of item.lines || []) if (line.name) services.set(line.name, (services.get(line.name) || 0) + (Number(line.quantity) || 0) * (Number(line.price) || 0));
  }
  const top = map => [...map].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => `<div class="row mut"><span>${esc(name)}</span><b>${amount.toLocaleString('fa-IR')} تومان</b></div>`).join('') || '<div class="mut">هنوز موردی نیست.</div>';
  return `<details class="card invoice-ledger"><summary><b>🧾 حساب و آمار فاکتورها</b></summary><div class="mut">فاکتورها جدا از تراکنش‌های بانکی حساب می‌شوند.</div><div class="invoice-report-170"><label>از تاریخ شمسی<input class="invoice-from-170" placeholder="۱۴۰۵/۰۱/۰۱"></label><label>تا تاریخ شمسی<input class="invoice-to-170" placeholder="۱۴۰۵/۱۲/۲۹"></label><label>نوع<select class="invoice-report-type-170"><option value="all">همه</option><option value="service">خدماتی</option><option value="sale">فروش</option><option value="expense">هزینه</option></select></label><div class="invoice-report-result-170">${invoiceAnalytics170(list)}</div></div><div class="invoice-ledger-grid"><div>تأییدشده<b>${confirmed.length.toLocaleString('fa-IR')}</b></div><div>منتظر تأیید<b>${(list.length-confirmed.length).toLocaleString('fa-IR')}</b></div><div>جمع فاکتورهای تأییدشده<b>${sum(confirmed, x => x.total)} تومان</b></div><div>هزینه لوازم<b>${sum(confirmed, x => x.accounting.materials)} تومان</b></div><div>سهم دستیار<b>${sum(confirmed, x => x.share)} تومان</b></div><div>سهم نهایی من<b>${sum(confirmed, x => x.accounting.ownerNet)} تومان</b></div><div>نسیه‌ها (${unpaid.length.toLocaleString('fa-IR')})<b>${sum(unpaid, x => x.total)} تومان</b></div></div><div class="mut">نسیه شامل فاکتورهای تأییدنشده هم هست؛ واریزهای سنجاق‌شده در وضعیت پرداخت هر فاکتور نمایش داده می‌شوند.</div><details><summary>آمار مشتری و خدمات فاکتورهای تأییدشده</summary><div class="mut">مبلغ کل فاکتور یا ردیف خدمت پیش از کسر لوازم و سهم‌ها</div><b>مشتری‌ها</b>${top(customers)}<b>خدمات و کالا</b>${top(services)}</details><button type="button" class="invoice-open-list">جست‌وجو و بررسی فاکتورها</button></details>`;
}
document.addEventListener('change', event => {
  if (!event.target.matches('.invoice-from-170,.invoice-to-170,.invoice-report-type-170')) return;
  const box = event.target.closest('.invoice-report-170'), normalize = x => String(x).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const from = normalize(box.querySelector('.invoice-from-170').value.trim()), to = normalize(box.querySelector('.invoice-to-170').value.trim());
  if ((from && !/^\d{4}\/\d{2}\/\d{2}$/.test(from)) || (to && !/^\d{4}\/\d{2}\/\d{2}$/.test(to)) || (from && to && from > to)) { box.querySelector('.invoice-report-result-170').textContent = 'تاریخ‌ها را مانند ۱۴۰۵/۰۸/۰۱ و به ترتیب وارد کن.'; return; }
  box.querySelector('.invoice-report-result-170').innerHTML = invoiceAnalytics170(invoiceList().filter(i => typeof topic === 'undefined' || topic !== 'sales' || i.kind === 'فروش'), from, to, box.querySelector('.invoice-report-type-170').value);
});
function invoiceCreditHtml() {
  const list = invoiceList().filter(item => invoiceIsUnpaid173k(item, tx));
  if (!list.length) return '';
  return `<details class="card"><summary><b>🧾 فاکتورهای نسیه (${list.length.toLocaleString('fa-IR')})</b></summary><div class="mut">فاکتورهای نسیه جدا از حساب قرض هستند؛ برای تغییر وضعیت تسویه، فاکتور را ویرایش کن.</div>${list.map(item => `<div class="invoice-result"><b>${esc(item.customer || 'بدون نام')} · ${esc(item.number)}</b><div class="mut">${esc(item.date || '')} · ${esc(item.phone || '')} · ${item.accounting?.status === 'confirmed' ? 'تأییدشده' : 'در انتظار تأیید'}</div><b>${Number(item.total || 0).toLocaleString('fa-IR')} تومان</b></div>`).join('')}<button type="button" class="invoice-open-list" data-filter="unpaid">بررسی فاکتورهای نسیه</button></details>`;
}
function invoiceFormLines() {
  return [...document.querySelectorAll('#invoice-lines .invoice-line')].map(row => ({ name: row.querySelector('.inv-item').value.trim(), quantity: invoiceDigits(row.querySelector('.inv-qty').value), price: invoiceDigits(row.querySelector('.inv-price').value) }));
}
function invoiceTotals(lines, mode, value, assistant) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('حداقل یک ردیف لازم است');
  let total = 0;
  for (const item of lines) {
    if (!item.name || item.quantity === null || item.quantity < 1 || item.price === null) throw new Error('نام، تعداد و قیمت هر ردیف را درست وارد کن');
    const amount = item.quantity * item.price;
    if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(total + amount) || (total + amount) > Math.floor(Number.MAX_SAFE_INTEGER / 100)) throw new Error('مبلغ فاکتور بیش از حد بزرگ است');
    total += amount;
  }
  let share = 0;
  if (assistant) {
    const normalized = String(value).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[,٬\s]/g, '');
    if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error('سهم دستیار را وارد کن');
    const number = Number(normalized);
    if (mode === 'percent') { if (number > 100) throw new Error('درصد سهم باید بین صفر و ۱۰۰ باشد'); share = Math.round(total * number / 100); }
    else { share = invoiceDigits(value); if (share === null) throw new Error('مبلغ سهم معتبر نیست'); }
    if (!Number.isSafeInteger(share) || share > total) throw new Error('سهم دستیار نمی‌تواند بیشتر از مبلغ فاکتور باشد');
  }
  return { total, share };
}
function invoiceRefreshTotal() {
  const total = document.getElementById('inv-total'), share = document.getElementById('inv-share-result');
  document.querySelectorAll('#invoice-lines .invoice-line').forEach(row => {
    const output = row.querySelector('.inventory-line-total');
    if (!output) return;
    const quantity = invoiceDigits(row.querySelector('.inv-qty').value), price = invoiceDigits(row.querySelector('.inv-price').value);
    const amount = quantity === null || price === null ? 0 : quantity * price;
    output.textContent = INVENTORY_TEXT_FA.rowTotal + ': ' + (Number.isSafeInteger(amount) ? amount : 0).toLocaleString('fa-IR') + ' ' + INVENTORY_TEXT_FA.toman;
  });
  try {
    const result = invoiceTotals(invoiceFormLines(), document.getElementById('inv-share-mode').value, document.getElementById('inv-share').value, document.getElementById('inv-assistant').value);
    if (document.getElementById('inv-kind').value !== 'inventory_purchase') invoiceOwnerSync170(result.total);
    total.textContent = 'جمع: ' + result.total.toLocaleString('fa-IR') + ' تومان';
    share.textContent = document.getElementById('inv-assistant').value ? 'سهم دستیار: ' + result.share.toLocaleString('fa-IR') + ' تومان' : '';
    const purchase = document.getElementById('inv-kind').value === 'inventory_purchase';
    const account = invoiceAccount(result.total, purchase ? '0' : document.getElementById('inv-materials').value, purchase ? '100' : document.getElementById('inv-owner-percent').value, result.share);
    document.getElementById('inv-account-result').textContent = 'پس از لوازم: ' + (result.total - account.materials).toLocaleString('fa-IR') + ' · ' + account.ownerPercent.toLocaleString('fa-IR', { maximumFractionDigits: 12 }) + '٪ = ' + account.ownerGross.toLocaleString('fa-IR') + ' تومان · سهم نهایی من: ' + account.ownerNet.toLocaleString('fa-IR') + ' تومان';
  } catch (error) { total.textContent = 'جمع پس از تکمیل ردیف‌ها نمایش داده می‌شود.'; share.textContent = ''; document.getElementById('inv-account-result').textContent = error.message || ''; }
}
function invoiceShowList(query = '') {
  const box = document.getElementById('inv-results'); if (!box) return;
  const term = nrm(pfa(query));
  const filter = document.getElementById('inv-filter')?.value || 'all';
  const filters = { states:[...document.querySelectorAll('#inv-multi-filters [data-state]:checked')].map(x=>x.dataset.state), kinds:[...document.querySelectorAll('#inv-multi-filters [data-kind]:checked')].map(x=>x.dataset.kind) };
  const type170 = document.querySelector('#inv-types-170 [aria-pressed="true"]')?.dataset.invoiceType || 'all';
  const status170 = document.getElementById('inv-status-170')?.value || 'all';
  const month170 = document.getElementById('inv-month-170')?.value || '';
  const matches = invoiceList().filter(item => (type170 === 'unpaid' ? invoiceIsUnpaid173k(item, tx) : invoiceTypeMatches170(item, type170)) && (status170 === 'all' || invoiceStatus170(item, tx) === status170) && (!month170 || String(item.date || '').slice(0,7) === month170) && invoiceMatchesFilters(item, tx, filters) && (typeof topic === 'undefined' || topic !== 'sales' || item.kind === 'فروش') && (!term || [item.number, item.customer, item.phone, item.ownerName, item.ownerPhone, item.plate, item.model, item.date, item.total, ...(item.lines || []).map(line => line.name)].some(value => nrm(pfa(value || '')).includes(term))) && (filter === 'all' || (filter === 'service' ? (item.kind || 'خدمات') === 'خدمات' : filter === 'sale' ? item.kind === 'فروش' : filter === 'unpaid' ? item.payment?.method === 'unpaid' && invoicePaymentStatus(item, tx).status !== 'paid' : filter === 'confirmed' ? item.accounting?.status === 'confirmed' : item.accounting?.status !== 'confirmed')));
  const summary173p=document.getElementById('invoice-summary-173p');
  if(summary173p && typeof invoiceSummary173g==='function') { const s=invoiceSummary173g(matches,tx,invoiceDate().slice(0,7)); summary173p.innerHTML='<div>خلاصهٔ فاکتورها</div><strong>'+s.monthly.toLocaleString('fa-IR')+' <small>تومان جمع ماه</small></strong><div class="invoice-summary-meta-173p"><span>ماندهٔ طلب: '+s.debt.toLocaleString('fa-IR')+' تومان</span><span>تعداد: '+s.count.toLocaleString('fa-IR')+'</span></div>'; }
  const overview = document.getElementById('inv-overview-170');
  if (overview) {
    const currentMonth = invoiceDate().slice(0,7);
    if (typeof invoiceSummary173g === 'function') {
      const html = matches.length.toLocaleString('fa-IR') + ' فاکتور · جمع کل ' + matches.reduce((sum, item) => sum + (Number(item.total) || 0), 0).toLocaleString('fa-IR') + ' تومان';
      overview.innerHTML = html;
      const top = document.getElementById('invoice-top-summary-173g'); if (top) top.innerHTML = html;
    }
  }
  const list = term || document.getElementById('inv-show-all')?.checked ? matches : matches.slice(0, 10);
  const summary = `<div class="mut">${matches.length.toLocaleString('fa-IR')} فاکتور · جمع کل ${matches.reduce((sum,item)=>sum+(Number(item.total)||0),0).toLocaleString('fa-IR')} تومان${list.length < matches.length ? ' · ۱۰ مورد اخیر نمایش داده می‌شود' : ''}</div>`;
  box.innerHTML = summary + (list.length ? list.map(item => {
    if (invoiceKind(item) === 'inventory_purchase') return `<details class="invoice-result" style="border-right:4px solid ${invoiceKindColor(item)}"><summary><b>${esc(INVENTORY_TEXT_FA.purchaseKind)}</b> · ${esc(item.customer || INVENTORY_TEXT_FA.purchaseNoSeller)} · ${esc(item.number)} · ${Number(item.total || 0).toLocaleString('fa-IR')} ${esc(INVENTORY_TEXT_FA.toman)}</summary><div class="mut">${esc(item.date || '')}</div><div>${(item.lines || []).map(line => `<div>${esc(line.name)} · ${Number(line.quantity).toLocaleString('fa-IR')} × ${Number(line.price).toLocaleString('fa-IR')} = ${(Number(line.quantity) * Number(line.price)).toLocaleString('fa-IR')} ${esc(INVENTORY_TEXT_FA.toman)}</div>`).join('')}</div><div class="invoice-actions"><button type="button" class="sec invoice-edit" data-id="${esc(item.id)}">${esc(INVENTORY_TEXT_FA.edit)}</button><button type="button" class="sec invoice-print" data-id="${esc(item.id)}">${esc(INVENTORY_TEXT_FA.print)}</button><button type="button" class="sec invoice-delete" data-id="${esc(item.id)}">${esc(INVENTORY_TEXT_FA.remove)}</button><button type="button" class="sec invoice-close-173g">${esc(INVENTORY_TEXT_FA.close)}</button></div></details>`;
    const displayPct177 = invoiceDisplayPercent177(item, tx);
    const account = item.accounting, confirmed = account?.status === 'confirmed', payment = invoicePaymentStatus(item, tx);
    const paymentLabel = payment.status === 'paid' ? 'واریز شد ✅' : payment.status === 'partial' ? 'پرداخت بخشی' : item.payment?.method === 'unpaid' ? 'نسیه' : 'بدون واریز سنجاق‌شده';
    const eligible = tx.filter(t => !t.ghost && t.type === 'credit' && !t.invoicePaymentId);
    const links = payment.payments.map(t => '<div class="mut">' + esc(t.bank || accName(t.account) || 'بانک نامشخص') + ' · ' + esc(t.date || '') + ' · ' + (Number(t.amount)/10).toLocaleString('fa-IR') + ' تومان' + (t.receipt || t.raw ? '<div style="white-space:pre-wrap;overflow-wrap:anywhere">🧾 ' + esc(t.receipt || t.raw) + '</div>' : '') + ' <button type="button" class="sec invoice-tx-jump" data-tid="' + esc(t.id) + '">↩ رفتن به تراکنش</button> <button type="button" class="sec invoice-unpin" data-id="' + esc(item.id) + '" data-tid="' + esc(t.id) + '">برداشتن سنجاق</button></div>').join('');
    const options = eligible.map(t => '<option value="' + esc(t.id) + '">' + esc(t.bank || accName(t.account) || 'بانک') + ' · ' + esc(t.date || '') + ' · ' + (Number(t.amount)/10).toLocaleString('fa-IR') + ' تومان</option>').join('');
    const rejected178=load('invoiceReject178',[]), suggestions178=invoiceDepositSuggestions178(item,tx,Array.isArray(rejected178)?rejected178:[]);
    const suggested178=suggestions178.map(x=>'<div class="card"><b>💡 پیشنهاد واریز · '+(x.name && x.exact?'شباهت زیاد':'نیاز به بررسی')+'</b><div class="mut">'+esc(x.t.date||'')+' · '+(Number(x.t.amount)/10).toLocaleString('fa-IR')+' تومان · '+esc(x.t.customer || x.t.desc || accName(x.t.account) || '')+'</div><button type="button" class="invoice-suggest-yes-178" data-id="'+esc(item.id)+'" data-tid="'+esc(x.t.id)+'">بله، سنجاق کن</button> <button type="button" class="sec invoice-suggest-no-178" data-id="'+esc(item.id)+'" data-tid="'+esc(x.t.id)+'">نه</button></div>').join('');
    const paymentControls = '<details class="invoice-account-box"><summary>سنجاق واریز · ' + paymentLabel + (suggestions178.length?' · 💡 پیشنهاد':'') + '</summary>' + (payment.payments.length ? payment.amount.toLocaleString('fa-IR') + ' تومان' : '') + links + suggested178 + '<label>سنجاق واریز<select class="invoice-payment-choice"><option value="">انتخاب تراکنش واریزی</option>' + options + '</select></label><button type="button" class="sec invoice-pin" data-id="' + esc(item.id) + '">سنجاق تراکنش</button></details>';

    return `<details class="invoice-result" style="border-right:4px solid ${invoiceKindColor(item)}"><summary><span style="color:${invoiceKindColor(item)}">${esc(invoiceKind(item))}${item.proforma ? ' · پیش‌فاکتور' : ''}</span> · <b>${esc(item.customer || 'بدون نام')}</b> · ${esc(item.number)} · ${Number(item.total || 0).toLocaleString('fa-IR')} تومان</summary><div class="mut">${esc(item.date)} · ${esc(item.phone)}${item.ownerName || item.ownerPhone ? ' · صاحب خودرو: ' + esc(item.ownerName || 'نام ثبت نشده') + (item.ownerPhone ? ' · ' + esc(item.ownerPhone) : '') : ''} · ${esc(item.plate)} · ${esc(item.model)} · ${esc(item.color)} · ${esc(item.carType)}</div><div class="mut">تسویه: ${esc(invoicePaymentLabel(item.payment?.method))}${item.payment?.recipient ? ' · دریافت‌کننده: ' + esc(item.payment.recipient) : ''}${item.payment?.account ? ' · کارت / حساب: ' + esc(item.payment.account) : ''}${item.payment?.note ? ' · ' + esc(item.payment.note) : ''}</div><div>${(item.lines || []).map(line => `<div>${esc(line.name)} · ${Number(line.quantity).toLocaleString('fa-IR')} × ${Number(line.price).toLocaleString('fa-IR')} تومان</div>`).join('')}</div>${paymentControls}<div class="mut">مانده: ${Math.max(0,(Number(item.total)||0)-payment.amount).toLocaleString('fa-IR')} تومان${payment.payments.length ? '' : ' (بدون واریز سنجاق‌شده)'}</div><div class="invoice-account-box"><b style="color:${confirmed ? '#15803d' : '#a16207'}">${confirmed ? '✓ تأییدشده' : '⏳ در انتظار تأیید'}</b>${account ? `<div class="mut">لوازم: ${Number(account.materials).toLocaleString('fa-IR')} · سهم من: ${Number(account.ownerPercent).toLocaleString('fa-IR')}٪ · سهم پیش از دستیار: ${Number(account.ownerGross).toLocaleString('fa-IR')} · دستیار${displayPct177 !== null ? ' (' + displayPct177.toLocaleString('fa-IR') + '٪)' : ''}: ${Number(item.share || 0).toLocaleString('fa-IR')} · سهم نهایی من: <b>${Number(account.ownerNet).toLocaleString('fa-IR')} تومان</b></div>` : '<div class="mut">برای تعیین لوازم و سهم، فاکتور قدیمی را ویرایش و ذخیره کن.</div>'}${account && !confirmed ? `<button type="button" class="invoice-confirm" data-id="${esc(item.id)}">تأیید و ثبت در حساب فاکتورها</button>` : ''}</div>${item.assistant ? `<div class="mut">دستیار: ${esc(item.assistant)}${displayPct177 !== null ? ' (' + displayPct177.toLocaleString('fa-IR') + '٪)' : ''} · سهم ${Number(item.share || 0).toLocaleString('fa-IR')} تومان${invoiceWorkRegistered173m(item, tx) ? ' ✓' : ''}${invoiceWorkRegistered173m(item, tx) ? ' · <b style="color:#15803d">✓ ثبت شده در کارکرد</b>' : ' · <b style="color:#c0392b">در کارکرد ثبت نشده</b>'}</div><button type="button" class="${invoiceWorkRegistered173m(item, tx) ? 'invoice-work-done' : 'sec invoice-work'}" data-id="${esc(item.id)}" ${invoiceWorkRegistered173m(item, tx) ? 'disabled style="background:#15803d;color:white;opacity:1"' : ''}>${invoiceWorkRegistered173m(item, tx) ? '✓ محاسبه شده' : 'ثبت سهم در کارکرد دستیار'}</button>` : ''}<div class="invoice-actions"><button type="button" class="sec invoice-edit" data-id="${esc(item.id)}">ویرایش فاکتور</button><button type="button" class="sec invoice-print" data-id="${esc(item.id)}">نمایش و چاپ</button><button type="button" class="sec invoice-delete" data-id="${esc(item.id)}">حذف</button><button type="button" class="sec invoice-close-173g">بستن</button></div></details>`;
  }).join('') : '<div class="mut">فاکتوری پیدا نشد.</div>');
  box.querySelectorAll('.invoice-result').forEach((card,index) => {
    const item = list[index], summaryNode = card.querySelector('summary');
    if (!item || !summaryNode) return;
    const kind = invoiceKind(item), state = invoiceStatus170(item, tx);
    card.style.borderRightColor = ({paid:'#16845b',partial:'#d97706',unpaid:'#dc4d52'})[state] || '#94a3b8';
    card.dataset.invoiceId = String(item.id);
    if (typeof invoiceCardSummary173g === 'function') {
      summaryNode.innerHTML = invoiceCardSummary173g(item, tx);
      return;
    }
    if (typeof tab !== 'undefined' && tab === 'report') {
      const status = item.payment?.method === 'unpaid' && state !== 'paid' ? 'نسیه' : item.accounting?.status === 'confirmed' ? '✓ تأییدشده' : 'در انتظار';
      const color = status === 'نسیه' ? '#b92d61' : status.startsWith('✓') ? '#147345' : '#9a6500';
      summaryNode.innerHTML = '<span class="invoice-table-173f"><span>' + esc(item.number || '—') + '</span><span><b>' + esc(item.customer || 'بدون نام') + '</b><small style="display:block">' + esc(item.date || '') + '</small></span><strong>' + (Number(item.total) || 0).toLocaleString('fa-IR') + ' تومان</strong><span style="color:' + color + '">' + status + '</span></span>';
      return;
    }
    summaryNode.innerHTML = '<span class="invoice-card-name-170"><b>' + esc(item.customer || 'بدون نام') + '</b><small>شماره ' + esc(item.number || '—') + '</small></span><strong class="invoice-amount-170">' + (Number(item.total) || 0).toLocaleString('fa-IR') + ' تومان</strong><span class="invoice-tags-170"><span>' + esc(item.date || 'تاریخ ثبت نشده') + '</span><span style="color:' + (kind === 'خدمات دائمی' ? '#16845b' : invoiceKindColor(item)) + '">' + esc(kind === 'خدمات دائمی' ? 'خدماتی · دائمی' : kind) + '</span><span class="invoice-status-170 status-' + state + '">' + invoiceStatusLabel170(state) + '</span></span>';
  });
  if (typeof invoiceCardSummary173g !== 'function' && typeof tab !== 'undefined' && tab === 'report') box.insertAdjacentHTML('afterbegin', '<div class="invoice-table-173f invoice-table-head-173f"><span>شماره</span><span>مشتری</span><span>مبلغ</span><span>وضعیت</span></div>');
  return;
}
function invoicePrint(item) {
  const popup = window.open('', '_blank');
  if (!popup) { alert('پنجره چاپ باز نشد؛ اجازه باز شدن پنجره را بررسی کن.'); return; }
  const lines = item.lines.map(line => `<tr><td>${esc(line.name)}</td><td>${Number(line.quantity).toLocaleString('fa-IR')}</td><td>${Number(line.price).toLocaleString('fa-IR')}</td><td>${(line.quantity * line.price).toLocaleString('fa-IR')}</td></tr>`).join('');
  popup.document.write(`<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>فاکتور ${esc(item.number)}</title><style>body{font-family:Tahoma,sans-serif;padding:24px;line-height:1.9}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}@media print{button{display:none}}</style></head><body><h2>فاکتور ${esc(item.kind)}</h2><div>شماره: ${esc(item.number)} · تاریخ: ${esc(item.date)}</div><div>مشتری: ${esc(item.customer)} · تماس: ${esc(item.phone)}</div>${item.ownerName || item.ownerPhone ? `<div>صاحب خودرو: ${esc(item.ownerName || '')} · تماس: ${esc(item.ownerPhone || '')}</div>` : ''}<div>خودرو: ${[item.plate,item.model,item.color,item.carType].map(esc).filter(Boolean).join(' · ')}</div><table><thead><tr><th>شرح</th><th>تعداد</th><th>قیمت واحد (تومان)</th><th>مبلغ (تومان)</th></tr></thead><tbody>${lines}</tbody></table><h3>جمع: ${Number(item.total).toLocaleString('fa-IR')} تومان</h3><button onclick="window.print()">چاپ / ذخیره PDF</button></body></html>`);
  popup.document.close();
}
function invoiceBind() {
  const card = document.getElementById('invoice-card'); if (!card) return;
  let editingInvoiceId = null;
  const contacts = load('ppl', []), peopleList = Array.isArray(contacts) ? contacts : [];
  const get = id => document.getElementById(id);
  get('inv-owner-percent').closest('label').insertAdjacentHTML('beforebegin', '<label>روش سهم من<select id="inv-owner-mode-170"><option value="percent">درصد</option><option value="fixed">مبلغ ثابت</option><option value="none">هیچ</option></select></label><div id="inv-owner-presets-170" class="invoice-types-170"><button type="button" data-owner-percent="10">۱۰٪</button><button type="button" data-owner-percent="20">۲۰٪</button><button type="button" data-owner-percent="30">۳۰٪</button><button type="button" data-owner-percent="50">۵۰٪</button><button type="button" data-owner-percent="custom">دلخواه</button></div><label id="inv-owner-fixed-label-170" hidden>مبلغ سهم (تومان)<input id="inv-owner-fixed-170" inputmode="numeric"></label>');
  const ownerMode170 = get('inv-owner-mode-170');
  ownerMode170.closest('label').insertAdjacentHTML('beforebegin', '<div id="inv-owner-modes-170" class="invoice-types-170" role="group" aria-label="روش سهم من"><button type="button" data-owner-mode="percent" aria-pressed="true">درصد</button><button type="button" data-owner-mode="fixed" aria-pressed="false">مبلغ ثابت</button><button type="button" data-owner-mode="none" aria-pressed="false">هیچ</button></div>');
  get('inv-owner-modes-170').addEventListener('click', event => { const button = event.target.closest('[data-owner-mode]'); if (!button) return; ownerMode170.value = button.dataset.ownerMode; ownerMode170.dispatchEvent(new Event('change')); });
  ownerMode170.addEventListener('change', () => { get('inv-owner-fixed-label-170').hidden = ownerMode170.value !== 'fixed'; get('inv-owner-presets-170').hidden = ownerMode170.value !== 'percent'; get('inv-owner-percent').closest('label').hidden = ownerMode170.value !== 'percent'; invoiceRefreshTotal(); });
  ownerMode170.addEventListener('change', () => get('inv-owner-modes-170').querySelectorAll('[data-owner-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ownerMode === ownerMode170.value))));
  get('inv-owner-presets-170').addEventListener('click', event => { const button = event.target.closest('[data-owner-percent]'); if (!button) return; if (button.dataset.ownerPercent === 'custom') get('inv-owner-percent').focus(); else { get('inv-owner-percent').value = button.dataset.ownerPercent; invoiceRefreshTotal(); } });
  get('inv-owner-fixed-170').addEventListener('input', event => { invoiceAmountInput(event.target); invoiceRefreshTotal(); });
  const searchPanel170 = get('invoice-search-panel');
  searchPanel170.querySelector('summary').insertAdjacentHTML('afterend', '<button type="button" class="sec" id="invoice-check-duplicates-172">بررسی تکراری‌های فاکتور</button><button type="button" class="sec" id="invoice-suggestions-178">💡 پیشنهاد واریز برای فاکتورها</button><div id="invoice-duplicates-172" aria-live="polite"></div>');
  const showDuplicates172 = () => {
    const groups = invoiceDuplicates172(tx), box = get('invoice-duplicates-172');
    box.innerHTML = groups.length ? groups.map((rows, index) => '<div class="invoice-account-box"><b>فاکتور ' + esc(rows[0].invoiceId) + ' · ' + esc(invoiceRowType172(rows[0])) + '</b><div class="mut">هیچ ردیفی حذف نمی‌شود. برای به‌روزرسانی خودکار، یک ردیف اصلی انتخاب کن؛ بقیه را جداگانه بررسی کن.</div>' + rows.map((row, rowIndex) => '<div class="row"><span>' + esc(row.person || 'بدون نام') + ' · ' + (Number(row.amount || 0) / 10).toLocaleString('fa-IR') + ' تومان · ' + esc(row.date || '') + (row.invoicePrimary172 ? ' · اصلی' : '') + '</span><button type="button" class="sec invoice-primary-172" data-group="' + index + '" data-row="' + rowIndex + '">انتخاب اصلی</button></div>').join('') + '</div>').join('') : '<div class="mut">ردیف تکراری مربوط به فاکتور پیدا نشد.</div>';
  };
  searchPanel170.querySelector('summary').insertAdjacentHTML('afterend', '<div id="inv-types-170" class="invoice-types-170" role="group" aria-label="نوع فاکتور"><button type="button" data-invoice-type="all" aria-pressed="true">همه</button><button type="button" data-invoice-type="service" aria-pressed="false">خدماتی</button><button type="button" data-invoice-type="sale" aria-pressed="false">فروش</button><button type="button" data-invoice-type="expense" aria-pressed="false">هزینه</button></div><div id="inv-overview-170" class="invoice-overview-170"></div><label>وضعیت<select id="inv-status-170"><option value="all">همه وضعیت‌ها</option><option value="paid">پرداخت‌شده</option><option value="recorded">روش پرداخت ثبت‌شده</option><option value="unpaid">نسیه</option><option value="partial">پرداخت بخشی</option><option value="proforma">پیش‌فاکتور</option><option value="unknown">نامشخص</option></select></label><label>ماه<select id="inv-month-170"><option value="">همه ماه‌ها</option></select></label>');
  [...new Set(invoiceList().map(i => String(i.date || '').slice(0,7)).filter(m => /^\d{4}\/\d{2}$/.test(m)))].sort().reverse().forEach(m => get('inv-month-170').insertAdjacentHTML('beforeend', '<option value="' + esc(m) + '">' + esc(m) + '</option>'));
  for (const id of ['inv-status-170','inv-month-170']) get(id).addEventListener('change', () => invoiceShowList(get('inv-search').value));
  get('inv-types-170').addEventListener('click', event => { const selected = event.target.closest('[data-invoice-type]'); if (!selected) return; get('inv-types-170').querySelectorAll('[data-invoice-type]').forEach(button => button.setAttribute('aria-pressed', String(button === selected))); invoiceShowList(get('inv-search').value); });
  get('inv-types-170').insertAdjacentHTML('beforeend', '<button type="button" data-invoice-type="unpaid" aria-pressed="false">نسیه</button>');
  if (featureOn('warehouse')) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.invoiceType = 'inventory_purchase'; button.setAttribute('aria-pressed', 'false'); button.textContent = INVENTORY_TEXT_FA.purchaseKind; get('inv-types-170').appendChild(button);
  }
  const purchaseOption = document.createElement('option'); purchaseOption.value = 'inventory_purchase'; purchaseOption.textContent = INVENTORY_TEXT_FA.purchaseKind; purchaseOption.hidden = !featureOn('warehouse'); get('inv-kind').appendChild(purchaseOption);
  const todayYear = Number(invoiceDate().slice(0, 4));
  for (const [id, start, end] of [['inv-jyear', todayYear - 20, todayYear + 10], ['inv-jmonth', 1, 12], ['inv-jday', 1, 31]]) get(id).innerHTML = Array.from({length:end-start+1}, (_,i) => `<option value="${start+i}">${(start+i).toLocaleString('fa-IR', { useGrouping: false })}</option>`).join('');
  const dateSelectors = () => { const m = get('inv-date').value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (m) for (const [id, value] of [['inv-jyear',m[1]],['inv-jmonth',m[2]],['inv-jday',m[3]]]) get(id).value = String(Number(value)); };
  dateSelectors(); get('inv-plate-letter').value = 'ع';
  const syncOwnerFields = () => { const purchase = get('inv-kind').value === 'inventory_purchase'; get('inv-owner-fields').hidden = purchase || get('inv-kind').value === 'فروش'; const heading = get('inv-customer').closest('.inv-sec174').querySelector('summary b'); heading.textContent = purchase ? INVENTORY_TEXT_FA.purchaseSeller : INVENTORY_TEXT_FA.customer; get('inv-customer').placeholder = purchase ? INVENTORY_TEXT_FA.purchaseSellerPlaceholder : INVENTORY_TEXT_FA.customerPlaceholder; for (const id of ['inv-assistant','inv-payment','inv-materials']) get(id).closest('.inv-sec174').hidden = purchase; };
  get('inv-kind').addEventListener('change', syncOwnerFields); syncOwnerFields();
  for (const id of ['inv-jyear','inv-jmonth','inv-jday']) get(id).onchange = () => { get('inv-date').value = get('inv-jyear').value + '/' + get('inv-jmonth').value.padStart(2,'0') + '/' + get('inv-jday').value.padStart(2,'0'); };
  get('inv-date').addEventListener('change', dateSelectors);
  const fillContacts173p=(groupId,selectId)=>{const group=get(groupId).value;get(selectId).disabled=!group;get(selectId).innerHTML='<option value="">انتخاب شخص</option>'+peopleList.map((person,index)=>({person,index})).filter(({person})=>group && (person.tags||[]).includes(group)).map(({person,index})=>`<option value="${index}">${esc(person.name||'')}</option>`).join('');};
  get('inv-pay-group').onchange=()=>fillContacts173p('inv-pay-group','inv-pay-contact');
  get('inv-owner-group').onchange=()=>fillContacts173p('inv-owner-group','inv-owner-contact');
  get('inv-owner-contact').onchange=event=>{const person=event.target.value===''?null:peopleList[Number(event.target.value)];if(person){get('inv-owner-name').value=person.name||'';get('inv-owner-phone').value=person.phone||'';event.target.closest('.inv-sec174').open=false;}};
  get('inv-pay-contact').onchange = event => { const person = event.target.value === '' ? null : peopleList[Number(event.target.value)]; if (person) { get('inv-pay-name').value = person.name || ''; get('inv-pay-card').value=(person.cards||[])[0] || (person.bankAccounts||[])[0] || ''; } };
  for (const id of ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran']) get(id).addEventListener('change', () => { const parts = ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran'].map(key => get(key).value.trim()); if (parts.every(Boolean)) get('inv-plate').value = parts[0] + ' ' + parts[1] + ' ' + parts[2] + ' ایران ' + parts[3]; });
  get('inv-add-line').onclick = () => { get('invoice-lines').insertAdjacentHTML('beforeend', invoiceLineHtml()); invoiceRefreshTotal(); };
  get('inv-contact-group').onchange = event => {
    const group = event.target.value;
    get('inv-contact').disabled=!group;
    if([...get('inv-person-role').options].some(option=>option.value===group)) get('inv-person-role').value=group;
    get('inv-contact').innerHTML = '<option value="">انتخاب شخص</option>' + peopleList.map((person, index) => ({ person, index })).filter(({ person }) => !group || (group === '__untagged' ? !Array.isArray(person.tags) || !person.tags.length : Array.isArray(person.tags) && person.tags.includes(group))).map(({ person, index }) => `<option value="${index}">${esc(person.name || '')}${person.phone ? ' · ' + esc(person.phone) : ''}</option>`).join('');
  };
  {
    const sum=()=>{const j=(...a)=>a.map(x=>String(x||'').trim()).filter(Boolean).join(' - ');const set=(i,t,d)=>{get(i).textContent=t||d};
      set('inv-sum-cust',j(get('inv-customer').value&&get('inv-person-role').value,get('inv-customer').value,get('inv-phone').value),'انتخاب نشده');
      set('inv-sum-owner',j(get('inv-owner-name').value && get('inv-owner-group').value,get('inv-owner-name').value,get('inv-owner-phone').value),'اختیاری');
      set('inv-sum-car',j(get('inv-car-type').value,get('inv-model').value,get('inv-color').value,get('inv-plate').value),'انتخاب نشده');};
    let tg='cust';const dlg=get('inv-newc-174');
    const open=t=>{tg=t;for(const i of ['name','family','phone'])get('inv-nc-'+i).value='';get('inv-nc-group').value=t==='owner'?'صاحب خودرو':'مشتری';dlg.hidden=false;get('inv-nc-name').focus();};
    get('inv-newc-cust').onclick=()=>open('cust');get('inv-newc-owner').onclick=()=>open('owner');
    get('inv-nc-cancel').onclick=()=>{dlg.hidden=true;};
    get('inv-nc-ok').onclick=()=>{
      const name=(get('inv-nc-name').value+' '+get('inv-nc-family').value).trim(),phone=get('inv-nc-phone').value.trim(),group=get('inv-nc-group').value;
      if(!name){get('inv-nc-name').focus();return;}
      let result; try { result=contactSaveFacts173p([{name,phone,role:group}]); } catch (_) { alert('\u0630\u062e\u06cc\u0631\u0647 \u0645\u062e\u0627\u0637\u0628 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.'); return; }
      if(result.skipped.length){alert('نام یا شماره با مخاطب دیگری تداخل دارد؛ لطفاً ابتدا آن را در مخاطبین بررسی کن.');return;}
      const list=load('ppl',[]), matches=list.filter(x=>contactNames(x).includes(nrm(name)));
      if(matches.length!==1){alert('\u0627\u0646\u062a\u062e\u0627\u0628 \u0645\u062e\u0627\u0637\u0628 \u0645\u0645\u06a9\u0646 \u0646\u0634\u062f.');return;}
      const p=matches[0]; peopleList.length=0;peopleList.push(...list);
      if(tg==='owner'){get('inv-owner-group').value=group;get('inv-owner-group').dispatchEvent(new Event('change'));get('inv-owner-contact').value=String(list.indexOf(p));get('inv-owner-name').value=p.name;get('inv-owner-phone').value=p.phone||'';get('inv-owner-group').closest('.inv-sec174').open=false;}
      else{get('inv-contact-group').value=group;if(!get('inv-contact-group').value){get('inv-contact-group').add(new Option(group,group));get('inv-contact-group').value=group;}get('inv-contact-group').dispatchEvent(new Event('change'));get('inv-contact').value=String(list.indexOf(p));get('inv-contact').dispatchEvent(new Event('change'));if([...get('inv-person-role').options].some(o=>o.value===group))get('inv-person-role').value=group;}
      dlg.hidden=true;get('inv-save').disabled=false;sum();};
    card.addEventListener('input',sum);card.addEventListener('change',sum);card.addEventListener('click',()=>setTimeout(sum,0));sum();
  }
  get('inv-contact-cancel').onclick = event => { get('inv-contact').value = ''; event.target.closest('details').open = false; };
  get('inv-cancel').onclick = () => {
    if (!confirm('اطلاعات واردشده در فرم فاکتور پاک و فرم بسته شود؟ فاکتورهای ذخیره‌شده باقی می‌مانند.')) return;
    ownerMode170.value = 'percent'; ownerMode170.dispatchEvent(new Event('change'));
    for (const id of ['inv-number', 'inv-customer', 'inv-phone', 'inv-owner-name', 'inv-owner-phone', 'inv-plate', 'inv-plate-left', 'inv-plate-mid', 'inv-plate-iran', 'inv-model', 'inv-color', 'inv-car-type', 'inv-share', 'inv-search', 'inv-pay-name', 'inv-pay-card', 'inv-pay-note', 'inv-materials']) get(id).value = '';
    get('inv-owner-percent').value = '100';
    for (const id of ['inv-contact-group', 'inv-contact', 'inv-car', 'inv-assistant', 'inv-plate-letter', 'inv-payment', 'inv-pay-contact']) get(id).selectedIndex = 0;
    editingInvoiceId = null; get('inv-proforma').checked = false; get('inv-save').textContent = 'ذخیره فاکتور'; get('inv-plate-letter').value = 'ع'; get('inv-kind').selectedIndex = 0; syncOwnerFields(); get('inv-share-mode').selectedIndex = 0; get('inv-date').value = invoiceDate(); dateSelectors(); get('invoice-lines').innerHTML = invoiceLineHtml(); get('inv-message').textContent = ''; get('inv-save').disabled = false; invoiceRefreshTotal(); invoiceShowList(); card.open = false;
  };
  get('inv-contact').onchange = event => {
    const person = event.target.value === '' ? null : peopleList[Number(event.target.value)];
    get('inv-car').innerHTML = '<option value="">انتخاب خودروی مخاطب (اختیاری)</option>' + (person && Array.isArray(person.cars) ? person.cars.map((car, index) => `<option value="${index}">${esc([car.plate, car.model, car.color, car.type].filter(Boolean).join(' · '))}</option>`).join('') : '');
    if (person) { get('inv-customer').value = person.name || ''; get('inv-phone').value = person.phone || ''; event.target.closest('.inv-sec174').open=false; }
  };
  get('inv-car').onchange = event => { const person = peopleList[Number(get('inv-contact').value)], car = person && person.cars && person.cars[Number(event.target.value)]; if (event.target.value !== '' && car) { get('inv-plate').value = car.plate || ''; get('inv-model').value = car.model || ''; get('inv-color').value = car.color || ''; get('inv-car-type').value = car.type || ''; } };
  get('inv-assistant').onchange = event => { if (event.target.value && get('inv-share-mode').value === 'percent') get('inv-share').value = cols()[event.target.value] ?? ''; invoiceRefreshTotal(); };
  get('inv-share-mode').onchange = () => { get('inv-share').value = ''; invoiceRefreshTotal(); };
  get('inv-search').oninput = event => invoiceShowList(event.target.value);
  get('inv-filter').onchange = () => invoiceShowList(get('inv-search').value);
  get('inv-show-all').onchange = () => invoiceShowList(get('inv-search').value);
  get('inv-multi-filters').addEventListener('change', () => invoiceShowList(get('inv-search').value));
  card.addEventListener('input', event => { if (!['inv-search','inv-filter','inv-show-all'].includes(event.target.id)) get('inv-save').disabled = false; if (event.target.classList.contains('inv-price') || event.target.id === 'inv-materials') invoiceAmountInput(event.target); if (event.target.matches('.inv-price,.inv-qty,#inv-share,#inv-materials,#inv-owner-percent')) invoiceRefreshTotal(); });
  card.addEventListener('change', event => { if (event.target.id !== 'inv-search') get('inv-save').disabled = false; if (event.target.classList.contains('inv-car-choice') && event.target.value) get(event.target.dataset.target).value = event.target.value; const isChoice = event.target.classList.contains('inv-service-choice'); if (!isChoice && !event.target.classList.contains('inv-item')) return; const row = event.target.closest('.invoice-line'); if (isChoice && event.target.value) row.querySelector('.inv-item').value = event.target.value; const item = invoiceCatalog().find(entry => entry.name === row.querySelector('.inv-item').value.trim()); if (item) row.querySelector('.inv-price').value = Number(item.price).toLocaleString('en-US'); else if (isChoice && event.target.value) row.querySelector('.inv-price').value = ''; invoiceRefreshTotal(); });
  card.addEventListener('click', event => {
    const close173g = event.target.closest('.invoice-close-173g'); if (close173g) { close173g.closest('details.invoice-result').open = false; return; }
    if (event.target.closest('#invoice-check-duplicates-172')) { showDuplicates172(); return; }
    const primary172 = event.target.closest('.invoice-primary-172');
    if (primary172) { const group = invoiceDuplicates172(tx)[Number(primary172.dataset.group)], row = group && group[Number(primary172.dataset.row)]; if (!row) { showDuplicates172(); return; } if (!confirm('این ردیف، ردیف اصلی فاکتور باشد؟ هیچ ردیفی حذف نمی‌شود.')) return; group.forEach(entry => { entry.invoicePrimary172 = entry === row; }); save(); showDuplicates172(); return; }
    const day = event.target.closest('.inv-day'); if (day) { get('inv-date').value = invoiceDate(Number(day.dataset.days)); dateSelectors(); return; }
    const remove = event.target.closest('.inv-remove-item'); if (remove) { if (document.querySelectorAll('#invoice-lines .invoice-line').length > 1) remove.closest('.invoice-line').remove(); else alert('حداقل یک ردیف لازم است'); invoiceRefreshTotal(); return; }
    const catalog = event.target.closest('.inv-save-item'); if (catalog) { const row = catalog.closest('.invoice-line'), name = row.querySelector('.inv-item').value.trim(), price = invoiceDigits(row.querySelector('.inv-price').value); if (!name || price === null) { alert('نام و قیمت را وارد کن'); return; } const items = invoiceCatalog(), old = items.find(item => item.name === name); if (old && !confirm('قیمت ثبت‌شده برای «' + name + '» تغییر کند؟')) return; if (old) old.price = price; else items.push({ name, price }); invoiceSaveData('invoiceCatalog', items); get('invoice-items').innerHTML = invoiceOptions([...load('svq', []), ...items.map(item => item.name)]); get('inv-message').textContent = 'نام و قیمت در فهرست ذخیره شد.'; return; }
    const suggestYes=event.target.closest('.invoice-suggest-yes-178'); if(suggestYes) { const item=invoiceList().find(i=>String(i.id)===suggestYes.dataset.id), t=tx.find(x=>String(x.id)===suggestYes.dataset.tid); if(!item || !t || !confirm('این واریز مربوط به فاکتور '+item.number+' است؟')) return; try { const note=invoicePinWithShare178(item,t); invoiceShowList(get('inv-search').value); if(note) alert(note); } catch(error){alert(error.message);} return; }
    const suggestNo=event.target.closest('.invoice-suggest-no-178'); if(suggestNo) { const rejected=load('invoiceReject178',[]), key=suggestNo.dataset.id+'|'+suggestNo.dataset.tid, list=Array.isArray(rejected)?rejected:[]; if(!list.includes(key)) list.push(key); localStorage.setItem('invoiceReject178',JSON.stringify(list)); invoiceShowList(get('inv-search').value); return; }
    if(event.target.closest('#invoice-suggestions-178')) { const boxes=[...card.querySelectorAll('.invoice-suggest-yes-178')]; if(!boxes.length){alert('پیشنهادی در فاکتورهای نمایش‌داده‌شده پیدا نشد.');return;} boxes.forEach(b=>{const result=b.closest('.invoice-result'); if(result)result.open=true; const details=b.closest('details');if(details)details.open=true;}); boxes[0].scrollIntoView({behavior:'smooth',block:'center'}); return; }
    const pin = event.target.closest('.invoice-pin'); if (pin) { const select = pin.parentElement.querySelector('.invoice-payment-choice'), item = invoiceList().find(x=>String(x.id)===pin.dataset.id), transaction = tx.find(t=>String(t.id)===select.value); if (!item || !transaction) { alert('یک واریز انتخاب کن.'); return; } try { const note=invoicePinWithShare178(item,transaction); invoiceShowList(get('inv-search').value); if(note) alert(note); } catch(error) { alert(error.message); } return; }
    const unpin = event.target.closest('.invoice-unpin'); if (unpin) { const transaction = tx.find(t=>String(t.id)===unpin.dataset.tid && String(t.invoicePaymentId)===unpin.dataset.id); if (!transaction) return; invoiceSetPaymentLink(transaction, ''); save(); invoiceShowList(get('inv-search').value); return; }
    const edit = event.target.closest('.invoice-edit'); if (edit) {
      event.preventDefault();
      const item = invoiceList().find(entry => String(entry.id) === edit.dataset.id); if (!item) return;
      ownerMode170.value = 'percent'; ownerMode170.dispatchEvent(new Event('change'));
      if (editingInvoiceId && !confirm('فرم ویرایش فعلی کنار گذاشته و این فاکتور باز شود؟')) return;
      if (typeof invoiceStartEditing === 'function') invoiceStartEditing();
      editingInvoiceId = item.id;
      for (const [id, value] of Object.entries({ 'inv-number':item.number, 'inv-date':item.date, 'inv-customer':item.customer, 'inv-phone':item.phone, 'inv-owner-name':item.ownerName, 'inv-owner-phone':item.ownerPhone, 'inv-plate':item.plate, 'inv-model':item.model, 'inv-color':item.color, 'inv-car-type':item.carType, 'inv-pay-name':item.payment?.recipient, 'inv-pay-card':item.payment?.account, 'inv-pay-note':item.payment?.note })) get(id).value = value || '';
      for (const id of ['inv-plate-left','inv-plate-mid','inv-plate-iran']) get(id).value = ''; get('inv-plate-letter').value = 'ع';
      get('inv-proforma').checked = !!item.proforma; get('inv-kind').value = item.kind || 'خدمات'; syncOwnerFields(); get('inv-payment').value = item.payment?.method || '';
      get('inv-materials').value = item.accounting?.materials ?? ''; get('inv-owner-percent').value = item.accounting?.ownerPercent ?? '100';
    get('inv-contact').value = ''; get('inv-car').value = ''; get('inv-pay-contact').value = ''; get('inv-person-role').value=item.customerGroup || (item.kind === 'فروش' ? 'مشتری' : 'راننده'); get('inv-pay-group').value=item.payment?.group || '';
      for (const select of card.querySelectorAll('.inv-car-choice')) select.value = get(select.dataset.target).value;
      get('inv-assistant').value = item.assistant || '';
      if (item.assistant && !get('inv-assistant').value) { const option = document.createElement('option'); option.value = item.assistant; option.textContent = item.assistant; get('inv-assistant').appendChild(option); get('inv-assistant').value = item.assistant; }
      const legacyShare = item.assistant && item.shareValue == null;
      get('inv-share-mode').value = legacyShare ? 'fixed' : (item.shareMode || 'percent'); get('inv-share').value = item.assistant ? String(legacyShare ? (item.share || 0) : item.shareValue ?? '') : '';
      get('invoice-lines').innerHTML = (item.lines?.length ? item.lines : [{}]).map(() => invoiceLineHtml()).join('');
      [...get('invoice-lines').querySelectorAll('.invoice-line')].forEach((row, i) => { const line = item.lines?.[i] || {}; row.querySelector('.inv-item').value = line.name || ''; row.querySelector('.inv-qty').value = line.quantity ?? 1; row.querySelector('.inv-price').value = line.price ?? ''; row.querySelector('.inv-service-choice').value = line.name || ''; });
      dateSelectors(); get('inv-save').disabled = false; get('inv-save').textContent = 'ذخیره تغییرات فاکتور'; invoiceRefreshTotal();
      get('inv-message').textContent = legacyShare ? 'این فاکتور قدیمی سهم دستیار را به مبلغ ثابت باز می‌کند؛ مبلغ قبلی حفظ شده است.' : 'فاکتور برای ویرایش باز شد؛ پس از تغییر، ذخیره را بزن.';
      card.scrollIntoView({ behavior:'smooth', block:'start' }); return;
    }
    const approve = event.target.closest('.invoice-confirm'); if (approve) { if (approve.disabled) return; approve.disabled = true; try { const list = invoiceList(), item = list.find(entry => String(entry.id) === approve.dataset.id); if (!item || !item.accounting || item.accounting.status === 'confirmed') return; const checked = invoiceAccount(item.total, String(item.accounting.materials), String(item.accounting.ownerPercent), item.share || 0); if (!confirm('سهم نهایی ' + checked.ownerNet.toLocaleString('fa-IR') + ' تومان تأیید شود؟ ردیف‌های ساخته‌شدهٔ همین فاکتور به‌روز می‌شوند؛ تراکنش بانکی تغییر نمی‌کند.')) return; const updated = invoiceUpdateRows172(item, tx); item.accounting = { ...checked, status:'confirmed', confirmedAt:new Date().toISOString() }; invoiceSaveData('invoices', list); if (updated) save(); invoiceShowList(get('inv-search').value); get('inv-message').textContent = '✅ فاکتور تأیید شد' + (updated ? ' و ردیف‌های مربوط به‌روز شدند.' : '.'); } catch (error) { alert(error.message); } finally { approve.disabled = false; } return; }
    const print = event.target.closest('.invoice-print'); if (print) { const item = invoiceList().find(entry => entry.id === print.dataset.id); if (item) invoicePrint(item); return; }
    const deleted = event.target.closest('.invoice-delete'); if (deleted) { const list = invoiceList(), item = list.find(entry => entry.id === deleted.dataset.id); if (!item) return; const linked = tx.some(entry => entry.invoiceId === item.id); if (!confirm('فاکتور «' + item.number + '» حذف شود؟' + (linked ? ' کارکرد دستیار که قبلاً ثبت شده حفظ می‌شود و جداگانه باید بررسی شود.' : ''))) return; invoiceSaveData('invoices', list.filter(entry => entry.id !== item.id)); invoiceShowList(get('inv-search').value); get('inv-message').textContent = 'فاکتور حذف شد.'; return; }
    const work = event.target.closest('.invoice-work'); if (work) { if (work.disabled) return; work.disabled = true; try { const item = invoiceList().find(entry => String(entry.id) === work.dataset.id); if (!item || !item.assistant || !item.share || !Number.isSafeInteger(item.share * 10)) { alert('\u0633\u0647\u0645 \u062f\u0633\u062a\u06cc\u0627\u0631 \u0628\u0627\u06cc\u062f \u0645\u0628\u0644\u063a \u0645\u0639\u062a\u0628\u0631 \u0648 \u0628\u06cc\u0634\u062a\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0628\u0627\u0634\u062f'); return; } const parent = shareParent173i(tx, item.id), matches = shareCandidates173i(tx, parent, item.id, item.assistant); if (matches.length > 1) throw new Error('\u0631\u062f\u06cc\u0641 \u062a\u06a9\u0631\u0627\u0631\u06cc \u067e\u06cc\u062f\u0627 \u0634\u062f\u061b \u0627\u0628\u062a\u062f\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646.'); if (!confirm('\u0633\u0647\u0645 ' + item.share.toLocaleString('fa-IR') + ' \u062a\u0648\u0645\u0627\u0646 \u0628\u0631\u0627\u06cc \u00ab' + item.assistant + '\u00bb \u062b\u0628\u062a \u06cc\u0627 \u0628\u0647\u200c\u0631\u0648\u0632 \u0634\u0648\u062f\u061f')) return; invoiceUpsertWork173i(item, tx, nowStr()); save(); invoiceShowList(get('inv-search').value); alert('\u06a9\u0627\u0631\u06a9\u0631\u062f \u062b\u0628\u062a \u0634\u062f.'); } catch (error) { alert(error.message); } finally { work.disabled = false; } return; }
  });
  get('inv-save').onclick = () => {
    const saveButton = get('inv-save'); if (saveButton.disabled) return; saveButton.disabled = true;
    let committed172 = false;
    try {
      const purchase = get('inv-kind').value === 'inventory_purchase';
      const lines = invoiceFormLines(), assistant = purchase ? '' : get('inv-assistant').value, mode = get('inv-share-mode').value, result = invoiceTotals(lines, mode, get('inv-share').value, assistant);
      if (!purchase) invoiceOwnerSync170(result.total);
      const accounting = invoiceAccount(result.total, purchase ? '0' : get('inv-materials').value, purchase ? '100' : get('inv-owner-percent').value, result.share);
      const date = get('inv-date').value.trim().replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
      const match = date.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (!match || Number(match[2]) < 1 || Number(match[2]) > 12 || Number(match[3]) < 1 || Number(match[3]) > 31) throw new Error('تاریخ را مانند 1405/08/17 وارد کن');
      const pm = Number(match[2]), pd = Number(match[3]); if (pm > 6 && pd > 30) throw new Error('روز انتخاب‌شده در این ماه شمسی معتبر نیست');
      const plateParts = ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran'].map(key => get(key).value.trim()); if ([plateParts[0],plateParts[2],plateParts[3]].some(Boolean) && !plateParts.every(Boolean)) throw new Error('همه بخش‌های پلاک را کامل کن یا بخش‌های عددی را خالی بگذار');
      const number = get('inv-number').value.trim() || String(Date.now());
      const list = invoiceList(), previous = editingInvoiceId ? list.find(item => item.id === editingInvoiceId) : null;
      if (editingInvoiceId && !previous) throw new Error('فاکتور اصلی پیدا نشد؛ تغییری ذخیره نشد');
      if (list.some(item => item.number === number && item.id !== editingInvoiceId)) throw new Error('این شماره فاکتور قبلاً ثبت شده است');
      const linked = previous && tx.some(entry => entry.invoiceId === previous.id);
      if (previous && !confirm('تغییرات فاکتور «' + previous.number + '» ذخیره شود؟ فاکتور برای تأیید مجدد به فهرست تأییدنشده‌ها برمی‌گردد.' + (linked ? ' پس از تأیید دوباره، ردیف‌های ساخته‌شدهٔ همین فاکتور به‌روز می‌شود؛ اگر تکراری باشند ابتدا ردیف اصلی را انتخاب کن.' : ''))) return;
      const item = { ...(previous || {}), id: previous?.id || 'invoice-' + Date.now() + '-' + Math.random().toString(36).slice(2), number, date: match[1] + '/' + match[2].padStart(2, '0') + '/' + match[3].padStart(2, '0'), customer: get('inv-customer').value.trim(), phone: get('inv-phone').value.trim(), ownerName: get('inv-owner-name').value.trim(), ownerPhone: get('inv-owner-phone').value.trim(), plate: get('inv-plate').value.trim(), model: get('inv-model').value.trim(), color: get('inv-color').value.trim(), carType: get('inv-car-type').value.trim(), kind: get('inv-kind').value, proforma: get('inv-proforma').checked, lines, total: result.total, assistant, share: result.share, shareMode: mode, shareValue: get('inv-share').value, payment: { ...(previous?.payment || {}), method: get('inv-payment').value, recipient: get('inv-pay-name').value.trim(), account: get('inv-pay-card').value.trim(), note: get('inv-pay-note').value.trim() }, createdAt: previous?.createdAt || new Date().toISOString() };
      item.customerGroup=purchase ? INVENTORY_TEXT_FA.sellerRole : (get('inv-person-role').value || 'مشتری'); item.payment.group=get('inv-pay-group').value || '';
      item.accounting = { ...accounting, status:'pending' };
      if (previous) list[list.indexOf(previous)] = item; else list.unshift(item); invoiceSaveData('invoices', list); committed172 = true;
      let contactNote=''; try { if(typeof contactSaveFacts173p==='function') { const r=contactSaveFacts173p([{name:item.customer,phone:item.phone,role:item.customerGroup},{name:item.ownerName,phone:item.ownerPhone,role:'صاحب خودرو'},{name:item.payment.recipient,account:item.payment.account,role:item.payment.group || 'سایر'},{name:item.assistant,role:'دستیار'}]); if(r.skipped.length) contactNote=' برخی نام‌های مشابه برای جلوگیری از ادغام نیاز به بررسی دارند.'; } } catch (_) { contactNote=' ذخیرهٔ مخاطب انجام نشد؛ از بخش مخاطبین بررسی کن.'; }
      editingInvoiceId = null; get('inv-save').textContent = 'ذخیره فاکتور'; get('inv-message').textContent = '✅ فاکتور ذخیره شد؛ در فهرست فاکتورها آن را بررسی و تأیید کن.' + contactNote; get('inv-number').value = ''; get('inv-save').disabled = true; invoiceShowList(get('inv-search').value); if (typeof addSaved164 === 'function' && typeof tab !== 'undefined' && tab === 'add' && !contactNote) setTimeout(() => addSaved164('invoice'), 0);
    } catch (error) { get('inv-message').textContent = '⚠️ ' + (error.message || 'ذخیره فاکتور انجام نشد'); }
    finally { saveButton.disabled = committed172; }
  };
  invoiceShowList();
}
