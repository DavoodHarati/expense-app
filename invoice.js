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
  return `<div class="invoice-line" style="border-top:1px solid #e5e7eb;padding-top:8px"><select class="inv-service-choice"><option value="">انتخاب خدمت یا کالا از فهرست</option>${invoiceSelectOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</select><input class="inv-item" list="invoice-items" placeholder="نام خدمت یا کالا"><div class="row"><label style="flex:0 0 75px">تعداد<input class="inv-qty" inputmode="numeric" value="1" aria-label="تعداد"></label><label style="flex:1">مبلغ واحد (تومان)<input class="inv-price" inputmode="numeric" placeholder="مبلغ به تومان"></label></div><div class="row"><button type="button" class="sec inv-save-item">ذخیره نام و قیمت در فهرست</button><button type="button" class="sec inv-remove-item">حذف ردیف</button></div></div>`;
}
function invoiceKind(item) { return ['خدمات', 'خدمات دائمی', 'فروش', 'هزینه'].includes(item.kind) ? item.kind : 'خدمات'; }
function invoiceTypeMatches170(item, type) {
  const kind = invoiceKind(item);
  return !type || type === 'all' || (type === 'service' && (kind === 'خدمات' || kind === 'خدمات دائمی')) || (type === 'sale' && kind === 'فروش') || (type === 'expense' && kind === 'هزینه');
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
function invoiceKindColor(item) { return ({'خدمات':'#16845b', 'خدمات دائمی':'#8249ad', 'فروش':'#2563c3', 'هزینه':'#c64b82'})[invoiceKind(item)]; }
function invoicePaymentStatus(item, transactions) {
  const payments = transactions.filter(t => String(t.invoicePaymentId || '') === String(item.id) && !t.ghost && t.type === 'credit');
  const amount = payments.reduce((sum, t) => sum + (Number(t.amount) || 0) / 10, 0);
  return { payments, amount, status: payments.length ? (amount >= Number(item.total || 0) ? 'paid' : 'partial') : 'unpaid' };
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
  const contacts = load('ppl', []), peopleList = Array.isArray(contacts) ? contacts : [], assistants = Object.keys(cols());
  return `<details class="card" id="invoice-card"><summary><b>🧾 ثبت و جست‌وجوی فاکتور</b></summary>
    <div id="invoice-form-fields"><div class="mut">ثبت فاکتور به‌تنهایی پرداخت بانکی یا کارکرد دستیار ثبت نمی‌کند.</div>
    <div class="row"><input id="inv-number" placeholder="شماره فاکتور (اختیاری)"><input id="inv-date" inputmode="numeric" value="${invoiceDate()}" placeholder="تاریخ 1405/08/17"></div>
    <div class="mut">انتخاب تاریخ شمسی:</div><div class="row" dir="rtl"><select id="inv-jday" aria-label="روز شمسی"></select><select id="inv-jmonth" aria-label="ماه شمسی"></select><select id="inv-jyear" aria-label="سال شمسی"></select></div>
    <div class="row"><button type="button" class="sec inv-day" data-days="0">امروز</button><button type="button" class="sec inv-day" data-days="1">دیروز</button><button type="button" class="sec inv-day" data-days="2">پریروز</button></div>
    <details><summary>انتخاب مخاطب از پرونده‌ها (اختیاری)</summary><select id="inv-contact-group"><option value="">همه گروه‌ها</option>${[...new Set(peopleList.flatMap(person => Array.isArray(person.tags) ? person.tags : []))].map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('')}<option value="__untagged">بدون گروه</option></select><select id="inv-contact"><option value="">انتخاب نکن؛ ورود دستی</option>${peopleList.map((person, index) => `<option value="${index}">${esc(person.name || '')}${person.phone ? ' · ' + esc(person.phone) : ''}</option>`).join('')}</select><button type="button" class="sec" id="inv-contact-cancel">بازگشت و ورود دستی</button></details>
    <input id="inv-customer" placeholder="نام راننده یا خریدار"><input id="inv-phone" inputmode="tel" placeholder="شماره تماس راننده یا خریدار"><div data-feature-section="vehicle"><div id="inv-owner-fields"><div class="mut">مشخصات صاحب خودرو (اختیاری)</div><input id="inv-owner-name" placeholder="نام و نام خانوادگی صاحب خودرو"><input id="inv-owner-phone" inputmode="tel" placeholder="شماره تماس صاحب خودرو"></div></div>
    <div data-feature-section="vehicle"><select id="inv-car"><option value="">انتخاب خودروی مخاطب (اختیاری)</option></select>
    <select class="inv-car-choice" data-target="inv-car-type"><option value="">انتخاب نوع خودرو</option>${invoiceSelectOptions(load('carTypes', []))}</select><input id="inv-car-type" placeholder="نوع خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-model"><option value="">انتخاب مدل خودرو</option>${invoiceSelectOptions(carModels())}</select><input id="inv-model" placeholder="مدل خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-color"><option value="">انتخاب رنگ خودرو</option>${invoiceSelectOptions(load('carColors', []))}</select><input id="inv-color" placeholder="رنگ خودرو (یا ورود دستی)"><label class="mut">پلاک (برای خودرو سنگین حرف ع را انتخاب کن)</label><div class="row" dir="ltr"><input id="inv-plate-left" inputmode="numeric" maxlength="2" placeholder="دو رقم" aria-label="دو رقم پلاک"><select id="inv-plate-letter" aria-label="حرف پلاک"><option value="">حرف</option>${'ابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی'.split('').map(c => `<option>${c}</option>`).join('')}</select><input id="inv-plate-mid" inputmode="numeric" maxlength="3" placeholder="سه رقم" aria-label="سه رقم پلاک"><input id="inv-plate-iran" inputmode="numeric" maxlength="2" placeholder="ایران" aria-label="کد ایران"></div><input id="inv-plate" placeholder="پلاک کامل (یا ورود دستی)"><div class="mut">فهرست مدل، رنگ و نوع خودرو در تنظیمات ← برچسب‌ها قابل ویرایش است.</div></div>
    <label><input id="inv-proforma" type="checkbox" style="width:auto"> پیش‌فاکتور (فقط نشانگر)</label><select id="inv-kind"><option value="خدمات">خدمات</option><option value="خدمات دائمی">خدمات دائمی</option><option value="فروش">فروش کالا</option><option value="هزینه">هزینه</option></select>
    <datalist id="invoice-items">${invoiceOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</datalist>
    <div id="invoice-lines">${invoiceLineHtml()}</div><button type="button" id="inv-add-line" class="sec">＋ افزودن خدمت یا کالا</button>
    <div id="inv-total" style="margin:10px 0;font-weight:bold">جمع: ۰ تومان</div>
    <b>نحوه تسویه</b><select id="inv-payment"><option value="">روش تسویه مشخص نشده</option><option value="unpaid">نسیه / پرداخت نشده</option><option value="cash">نقدی</option><option value="transfer">کارت به کارت</option><option value="pos">کارت‌خوان</option></select><select id="inv-pay-contact"><option value="">انتخاب دریافت‌کننده از مخاطبان (اختیاری)</option>${peopleList.map((person,index) => `<option value="${index}">${esc(person.name || '')}</option>`).join('')}</select><input id="inv-pay-name" placeholder="نام صاحب کارت یا دریافت‌کننده"><input id="inv-pay-card" inputmode="numeric" placeholder="شماره کارت یا حساب (اختیاری)"><input id="inv-pay-note" placeholder="توضیحات تسویه، کارت‌خوان یا پیگیری"><div class="mut">این بخش روش پرداخت را در فاکتور ثبت می‌کند؛ خودکار مانده بانکی یا حساب مخاطب را تغییر نمی‌دهد.</div>
    <div data-feature-section="assistant"><select id="inv-assistant"><option value="">بدون دستیار</option>${assistants.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select>
    <select id="inv-share-mode"><option value="percent">سهم درصدی</option><option value="fixed">مبلغ ثابت به تومان</option></select><input id="inv-share" inputmode="decimal" placeholder="درصد یا مبلغ سهم دستیار"><div id="inv-share-result" class="mut"></div></div>
    <div class="invoice-account-box"><b>حساب فاکتور</b><div class="mut">ابتدا هزینه لوازم کم می‌شود؛ سهم تو از باقی‌مانده حساب و سهم دستیار از آن کم می‌شود.</div><label>هزینه لوازم (تومان)<input id="inv-materials" inputmode="numeric" placeholder="۰"></label><label>درصد سهم من<input id="inv-owner-percent" inputmode="decimal" value="100" placeholder="درصد سهم من"></label><div id="inv-account-result" class="mut" aria-live="polite"></div></div>
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
  const rows = list.filter(i => i.accounting?.status === 'confirmed' && !i.proforma && invoiceTypeMatches170(i, type) && (!from || String(i.date || '') >= from) && (!to || String(i.date || '') <= to));
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
  const confirmed = list.filter(item => item.accounting?.status === 'confirmed');
  const unpaid = list.filter(item => item.payment?.method === 'unpaid');
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
  const list = invoiceList().filter(item => item.payment?.method === 'unpaid' && invoicePaymentStatus(item, tx).status !== 'paid');
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
  try {
    const result = invoiceTotals(invoiceFormLines(), document.getElementById('inv-share-mode').value, document.getElementById('inv-share').value, document.getElementById('inv-assistant').value);
    invoiceOwnerSync170(result.total);
    total.textContent = 'جمع: ' + result.total.toLocaleString('fa-IR') + ' تومان';
    share.textContent = document.getElementById('inv-assistant').value ? 'سهم دستیار: ' + result.share.toLocaleString('fa-IR') + ' تومان' : '';
    const account = invoiceAccount(result.total, document.getElementById('inv-materials').value, document.getElementById('inv-owner-percent').value, result.share);
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
  const matches = invoiceList().filter(item => invoiceTypeMatches170(item, type170) && (status170 === 'all' || invoiceStatus170(item, tx) === status170) && (!month170 || String(item.date || '').slice(0,7) === month170) && invoiceMatchesFilters(item, tx, filters) && (typeof topic === 'undefined' || topic !== 'sales' || item.kind === 'فروش') && (!term || [item.number, item.customer, item.phone, item.ownerName, item.ownerPhone, item.plate, item.model, item.date, ...(item.lines || []).map(line => line.name)].some(value => nrm(pfa(value || '')).includes(term))) && (filter === 'all' || (filter === 'service' ? (item.kind || 'خدمات') === 'خدمات' : filter === 'sale' ? item.kind === 'فروش' : filter === 'unpaid' ? item.payment?.method === 'unpaid' && invoicePaymentStatus(item, tx).status !== 'paid' : filter === 'confirmed' ? item.accounting?.status === 'confirmed' : item.accounting?.status !== 'confirmed')));
  const overview = document.getElementById('inv-overview-170');
  if (overview) {
    const currentMonth = invoiceDate().slice(0,7);
    const monthly = matches.filter(i => !i.proforma && String(i.date || '').slice(0,7) === currentMonth).reduce((n,i) => n + (Number(i.total) || 0), 0);
    const debt = matches.filter(i => !i.proforma && i.payment?.method === 'unpaid').reduce((n,i) => n + Math.max(0, (Number(i.total) || 0) - invoicePaymentStatus(i,tx).amount), 0);
    overview.innerHTML = '<div>جمع ماه<b>' + monthly.toLocaleString('fa-IR') + ' تومان</b></div><div>مانده نسیه<b>' + debt.toLocaleString('fa-IR') + ' تومان</b></div><div>تعداد<b>' + matches.length.toLocaleString('fa-IR') + '</b></div>';
  }
  const list = term || document.getElementById('inv-show-all')?.checked ? matches : matches.slice(0, 10);
  const summary = `<div class="mut">${matches.length.toLocaleString('fa-IR')} فاکتور · جمع کل ${matches.reduce((sum,item)=>sum+(Number(item.total)||0),0).toLocaleString('fa-IR')} تومان${list.length < matches.length ? ' · ۱۰ مورد اخیر نمایش داده می‌شود' : ''}</div>`;
  box.innerHTML = summary + (list.length ? list.map(item => {
    const account = item.accounting, confirmed = account?.status === 'confirmed', payment = invoicePaymentStatus(item, tx);
    const paymentLabel = payment.status === 'paid' ? 'واریز شد ✅' : payment.status === 'partial' ? 'پرداخت بخشی' : item.payment?.method === 'unpaid' ? 'نسیه' : 'بدون واریز سنجاق‌شده';
    const eligible = tx.filter(t => !t.ghost && t.type === 'credit' && !t.invoicePaymentId);
    const links = payment.payments.map(t => '<div class="mut">' + esc(t.bank || accName(t.account) || 'بانک نامشخص') + ' · ' + esc(t.date || '') + ' · ' + (Number(t.amount)/10).toLocaleString('fa-IR') + ' تومان <button type="button" class="sec invoice-unpin" data-id="' + esc(item.id) + '" data-tid="' + esc(t.id) + '">برداشتن سنجاق</button></div>').join('');
    const options = eligible.map(t => '<option value="' + esc(t.id) + '">' + esc(t.bank || accName(t.account) || 'بانک') + ' · ' + esc(t.date || '') + ' · ' + (Number(t.amount)/10).toLocaleString('fa-IR') + ' تومان</option>').join('');
    const paymentControls = '<div class="invoice-account-box"><b>' + paymentLabel + '</b>' + (payment.payments.length ? ' · ' + payment.amount.toLocaleString('fa-IR') + ' تومان' : '') + links + '<label>سنجاق واریز<select class="invoice-payment-choice"><option value="">انتخاب تراکنش واریزی</option>' + options + '</select></label><button type="button" class="sec invoice-pin" data-id="' + esc(item.id) + '">سنجاق تراکنش</button></div>';

    return `<details class="invoice-result" style="border-right:4px solid ${invoiceKindColor(item)}"><summary><span style="color:${invoiceKindColor(item)}">${esc(invoiceKind(item))}${item.proforma ? ' · پیش‌فاکتور' : ''}</span> · <b>${esc(item.customer || 'بدون نام')}</b> · ${esc(item.number)} · ${Number(item.total || 0).toLocaleString('fa-IR')} تومان</summary><div class="mut">${esc(item.date)} · ${esc(item.phone)}${item.ownerName || item.ownerPhone ? ' · صاحب خودرو: ' + esc(item.ownerName || 'نام ثبت نشده') + (item.ownerPhone ? ' · ' + esc(item.ownerPhone) : '') : ''} · ${esc(item.plate)} · ${esc(item.model)} · ${esc(item.color)} · ${esc(item.carType)}</div><div class="mut">تسویه: ${esc(invoicePaymentLabel(item.payment?.method))}${item.payment?.recipient ? ' · دریافت‌کننده: ' + esc(item.payment.recipient) : ''}${item.payment?.account ? ' · کارت / حساب: ' + esc(item.payment.account) : ''}${item.payment?.note ? ' · ' + esc(item.payment.note) : ''}</div><div>${(item.lines || []).map(line => `<div>${esc(line.name)} · ${Number(line.quantity).toLocaleString('fa-IR')} × ${Number(line.price).toLocaleString('fa-IR')} تومان</div>`).join('')}</div>${paymentControls}<div class="invoice-account-box"><b>${confirmed ? '✅ تأییدشده' : '⏳ در انتظار تأیید'}</b>${account ? `<div class="mut">لوازم: ${Number(account.materials).toLocaleString('fa-IR')} · سهم من: ${Number(account.ownerPercent).toLocaleString('fa-IR')}٪ · سهم پیش از دستیار: ${Number(account.ownerGross).toLocaleString('fa-IR')} · دستیار: ${Number(item.share || 0).toLocaleString('fa-IR')} · سهم نهایی من: <b>${Number(account.ownerNet).toLocaleString('fa-IR')} تومان</b></div>` : '<div class="mut">برای تعیین لوازم و سهم، فاکتور قدیمی را ویرایش و ذخیره کن.</div>'}${account && !confirmed ? `<button type="button" class="invoice-confirm" data-id="${esc(item.id)}">تأیید و ثبت در حساب فاکتورها</button>` : ''}</div>${item.assistant ? `<div class="mut">دستیار: ${esc(item.assistant)} · سهم ${Number(item.share || 0).toLocaleString('fa-IR')} تومان${tx.some(entry => entry.invoiceId === item.id) ? ' · در کارکرد ثبت شده' : ' · در کارکرد ثبت نشده'}</div><button type="button" class="sec invoice-work" data-id="${esc(item.id)}">ثبت سهم در کارکرد دستیار</button>` : ''}<div class="invoice-actions"><button type="button" class="sec invoice-edit" data-id="${esc(item.id)}">ویرایش فاکتور</button><button type="button" class="sec invoice-print" data-id="${esc(item.id)}">نمایش و چاپ</button><button type="button" class="sec invoice-delete" data-id="${esc(item.id)}">حذف</button></div></details>`;
  }).join('') : '<div class="mut">فاکتوری پیدا نشد.</div>');
  box.querySelectorAll('.invoice-result').forEach((card,index) => {
    const item = list[index], summaryNode = card.querySelector('summary');
    if (!item || !summaryNode) return;
    const kind = invoiceKind(item), state = invoiceStatus170(item, tx);
    if (kind === 'خدمات دائمی') card.style.borderRightColor = '#16845b';
    summaryNode.innerHTML = '<span class="invoice-card-name-170"><b>' + esc(item.customer || 'بدون نام') + '</b><small>شماره ' + esc(item.number || '—') + '</small></span><strong class="invoice-amount-170">' + (Number(item.total) || 0).toLocaleString('fa-IR') + ' تومان</strong><span class="invoice-tags-170"><span>' + esc(item.date || 'تاریخ ثبت نشده') + '</span><span style="color:' + (kind === 'خدمات دائمی' ? '#16845b' : invoiceKindColor(item)) + '">' + esc(kind === 'خدمات دائمی' ? 'خدماتی · دائمی' : kind) + '</span><span class="invoice-status-170 status-' + state + '">' + invoiceStatusLabel170(state) + '</span></span>';
  });
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
  searchPanel170.querySelector('summary').insertAdjacentHTML('afterend', '<button type="button" class="sec" id="invoice-check-duplicates-172">بررسی تکراری‌های فاکتور</button><div id="invoice-duplicates-172" aria-live="polite"></div>');
  const showDuplicates172 = () => {
    const groups = invoiceDuplicates172(tx), box = get('invoice-duplicates-172');
    box.innerHTML = groups.length ? groups.map((rows, index) => '<div class="invoice-account-box"><b>فاکتور ' + esc(rows[0].invoiceId) + ' · ' + esc(invoiceRowType172(rows[0])) + '</b><div class="mut">هیچ ردیفی حذف نمی‌شود. برای به‌روزرسانی خودکار، یک ردیف اصلی انتخاب کن؛ بقیه را جداگانه بررسی کن.</div>' + rows.map((row, rowIndex) => '<div class="row"><span>' + esc(row.person || 'بدون نام') + ' · ' + (Number(row.amount || 0) / 10).toLocaleString('fa-IR') + ' تومان · ' + esc(row.date || '') + (row.invoicePrimary172 ? ' · اصلی' : '') + '</span><button type="button" class="sec invoice-primary-172" data-group="' + index + '" data-row="' + rowIndex + '">انتخاب اصلی</button></div>').join('') + '</div>').join('') : '<div class="mut">ردیف تکراری مربوط به فاکتور پیدا نشد.</div>';
  };
  searchPanel170.querySelector('summary').insertAdjacentHTML('afterend', '<div id="inv-types-170" class="invoice-types-170" role="group" aria-label="نوع فاکتور"><button type="button" data-invoice-type="all" aria-pressed="true">همه</button><button type="button" data-invoice-type="service" aria-pressed="false">خدماتی</button><button type="button" data-invoice-type="sale" aria-pressed="false">فروش</button><button type="button" data-invoice-type="expense" aria-pressed="false">هزینه</button></div><div id="inv-overview-170" class="invoice-overview-170"></div><label>وضعیت<select id="inv-status-170"><option value="all">همه وضعیت‌ها</option><option value="paid">پرداخت‌شده</option><option value="recorded">روش پرداخت ثبت‌شده</option><option value="unpaid">نسیه</option><option value="partial">پرداخت بخشی</option><option value="proforma">پیش‌فاکتور</option><option value="unknown">نامشخص</option></select></label><label>ماه<select id="inv-month-170"><option value="">همه ماه‌ها</option></select></label>');
  [...new Set(invoiceList().map(i => String(i.date || '').slice(0,7)).filter(m => /^\d{4}\/\d{2}$/.test(m)))].sort().reverse().forEach(m => get('inv-month-170').insertAdjacentHTML('beforeend', '<option value="' + esc(m) + '">' + esc(m) + '</option>'));
  for (const id of ['inv-status-170','inv-month-170']) get(id).addEventListener('change', () => invoiceShowList(get('inv-search').value));
  get('inv-types-170').addEventListener('click', event => { const selected = event.target.closest('[data-invoice-type]'); if (!selected) return; get('inv-types-170').querySelectorAll('[data-invoice-type]').forEach(button => button.setAttribute('aria-pressed', String(button === selected))); invoiceShowList(get('inv-search').value); });
  const todayYear = Number(invoiceDate().slice(0, 4));
  for (const [id, start, end] of [['inv-jyear', todayYear - 20, todayYear + 10], ['inv-jmonth', 1, 12], ['inv-jday', 1, 31]]) get(id).innerHTML = Array.from({length:end-start+1}, (_,i) => `<option value="${start+i}">${(start+i).toLocaleString('fa-IR', { useGrouping: false })}</option>`).join('');
  const dateSelectors = () => { const m = get('inv-date').value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (m) for (const [id, value] of [['inv-jyear',m[1]],['inv-jmonth',m[2]],['inv-jday',m[3]]]) get(id).value = String(Number(value)); };
  dateSelectors(); get('inv-plate-letter').value = 'ع';
  const syncOwnerFields = () => { get('inv-owner-fields').hidden = get('inv-kind').value === 'فروش'; };
  get('inv-kind').addEventListener('change', syncOwnerFields); syncOwnerFields();
  for (const id of ['inv-jyear','inv-jmonth','inv-jday']) get(id).onchange = () => { get('inv-date').value = get('inv-jyear').value + '/' + get('inv-jmonth').value.padStart(2,'0') + '/' + get('inv-jday').value.padStart(2,'0'); };
  get('inv-date').addEventListener('change', dateSelectors);
  get('inv-pay-contact').onchange = event => { const person = event.target.value === '' ? null : peopleList[Number(event.target.value)]; if (person) get('inv-pay-name').value = person.name || ''; };
  for (const id of ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran']) get(id).addEventListener('change', () => { const parts = ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran'].map(key => get(key).value.trim()); if (parts.every(Boolean)) get('inv-plate').value = parts[0] + ' ' + parts[1] + ' ' + parts[2] + ' ایران ' + parts[3]; });
  get('inv-add-line').onclick = () => { get('invoice-lines').insertAdjacentHTML('beforeend', invoiceLineHtml()); invoiceRefreshTotal(); };
  get('inv-contact-group').onchange = event => {
    const group = event.target.value;
    get('inv-contact').innerHTML = '<option value="">انتخاب نکن؛ ورود دستی</option>' + peopleList.map((person, index) => ({ person, index })).filter(({ person }) => !group || (group === '__untagged' ? !Array.isArray(person.tags) || !person.tags.length : Array.isArray(person.tags) && person.tags.includes(group))).map(({ person, index }) => `<option value="${index}">${esc(person.name || '')}${person.phone ? ' · ' + esc(person.phone) : ''}</option>`).join('');
  };
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
    if (person) { get('inv-customer').value = person.name || ''; get('inv-phone').value = person.phone || ''; }
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
    if (event.target.closest('#invoice-check-duplicates-172')) { showDuplicates172(); return; }
    const primary172 = event.target.closest('.invoice-primary-172');
    if (primary172) { const group = invoiceDuplicates172(tx)[Number(primary172.dataset.group)], row = group && group[Number(primary172.dataset.row)]; if (!row) { showDuplicates172(); return; } if (!confirm('این ردیف، ردیف اصلی فاکتور باشد؟ هیچ ردیفی حذف نمی‌شود.')) return; group.forEach(entry => { entry.invoicePrimary172 = entry === row; }); save(); showDuplicates172(); return; }
    const day = event.target.closest('.inv-day'); if (day) { get('inv-date').value = invoiceDate(Number(day.dataset.days)); dateSelectors(); return; }
    const remove = event.target.closest('.inv-remove-item'); if (remove) { if (document.querySelectorAll('#invoice-lines .invoice-line').length > 1) remove.closest('.invoice-line').remove(); else alert('حداقل یک ردیف لازم است'); invoiceRefreshTotal(); return; }
    const catalog = event.target.closest('.inv-save-item'); if (catalog) { const row = catalog.closest('.invoice-line'), name = row.querySelector('.inv-item').value.trim(), price = invoiceDigits(row.querySelector('.inv-price').value); if (!name || price === null) { alert('نام و قیمت را وارد کن'); return; } const items = invoiceCatalog(), old = items.find(item => item.name === name); if (old && !confirm('قیمت ثبت‌شده برای «' + name + '» تغییر کند؟')) return; if (old) old.price = price; else items.push({ name, price }); invoiceSaveData('invoiceCatalog', items); get('invoice-items').innerHTML = invoiceOptions([...load('svq', []), ...items.map(item => item.name)]); get('inv-message').textContent = 'نام و قیمت در فهرست ذخیره شد.'; return; }
    const pin = event.target.closest('.invoice-pin'); if (pin) { const select = pin.parentElement.querySelector('.invoice-payment-choice'), item = invoiceList().find(x=>String(x.id)===pin.dataset.id), transaction = tx.find(t=>String(t.id)===select.value); if (!item || !transaction) { alert('یک واریز انتخاب کن.'); return; } try { invoiceSetPaymentLink(transaction, item.id); save(); invoiceShowList(get('inv-search').value); } catch(error) { alert(error.message); } return; }
    const unpin = event.target.closest('.invoice-unpin'); if (unpin) { const transaction = tx.find(t=>String(t.id)===unpin.dataset.tid && String(t.invoicePaymentId)===unpin.dataset.id); if (!transaction) return; invoiceSetPaymentLink(transaction, ''); save(); invoiceShowList(get('inv-search').value); return; }
    const edit = event.target.closest('.invoice-edit'); if (edit) {
      const item = invoiceList().find(entry => String(entry.id) === edit.dataset.id); if (!item) return;
      ownerMode170.value = 'percent'; ownerMode170.dispatchEvent(new Event('change'));
      if (editingInvoiceId && !confirm('فرم ویرایش فعلی کنار گذاشته و این فاکتور باز شود؟')) return;
      if (typeof invoiceStartEditing === 'function') invoiceStartEditing();
      editingInvoiceId = item.id;
      for (const [id, value] of Object.entries({ 'inv-number':item.number, 'inv-date':item.date, 'inv-customer':item.customer, 'inv-phone':item.phone, 'inv-owner-name':item.ownerName, 'inv-owner-phone':item.ownerPhone, 'inv-plate':item.plate, 'inv-model':item.model, 'inv-color':item.color, 'inv-car-type':item.carType, 'inv-pay-name':item.payment?.recipient, 'inv-pay-card':item.payment?.account, 'inv-pay-note':item.payment?.note })) get(id).value = value || '';
      for (const id of ['inv-plate-left','inv-plate-mid','inv-plate-iran']) get(id).value = ''; get('inv-plate-letter').value = 'ع';
      get('inv-proforma').checked = !!item.proforma; get('inv-kind').value = item.kind || 'خدمات'; syncOwnerFields(); get('inv-payment').value = item.payment?.method || '';
      get('inv-materials').value = item.accounting?.materials ?? ''; get('inv-owner-percent').value = item.accounting?.ownerPercent ?? '100';
      get('inv-contact').value = ''; get('inv-car').value = ''; get('inv-pay-contact').value = '';
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
    const work = event.target.closest('.invoice-work'); if (work) { if (work.disabled) return; work.disabled = true; try { const item = invoiceList().find(entry => String(entry.id) === work.dataset.id); if (!item || !item.assistant || !item.share || !Number.isSafeInteger(item.share * 10)) { alert('سهم دستیار باید مبلغ معتبر و بیشتر از صفر باشد'); return; } if (invoiceRows172(item, tx).some(entry => invoiceRowType172(entry) === 'assistant_work')) { alert('کارکرد این فاکتور قبلاً ثبت شده است؛ برای تغییر، فاکتور را ویرایش و دوباره تأیید کن.'); return; } if (!confirm('سهم ' + item.share.toLocaleString('fa-IR') + ' تومان برای «' + item.assistant + '» در کارکرد ثبت شود؟')) return; if (invoiceRows172(item, tx).some(entry => invoiceRowType172(entry) === 'assistant_work')) throw new Error('کارکرد این فاکتور قبلاً ثبت شده است.'); const source = tx.find(entry => entry.account) || {}; tx.push({ id: Date.now() + Math.random(), invoiceId: item.id, invoiceRowType:'assistant_work', ghost: true, bank: source.bank || '', account: source.account || '', type: 'credit', amount: item.share * 10, balance: null, date: item.date + ' ' + nowStr().slice(11), cat: 'کارکرد همکار', loan: 'share', person: item.assistant, desc: 'فاکتور ' + item.number + (item.customer ? ' · ' + item.customer : ''), pending: false }); save(); alert('کارکرد ثبت شد.'); } catch (error) { alert(error.message); } finally { work.disabled = false; } return; }
  });
  get('inv-save').onclick = () => {
    const saveButton = get('inv-save'); if (saveButton.disabled) return; saveButton.disabled = true;
    let committed172 = false;
    try {
      const lines = invoiceFormLines(), assistant = get('inv-assistant').value, mode = get('inv-share-mode').value, result = invoiceTotals(lines, mode, get('inv-share').value, assistant);
      invoiceOwnerSync170(result.total);
      const accounting = invoiceAccount(result.total, get('inv-materials').value, get('inv-owner-percent').value, result.share);
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
      item.accounting = { ...accounting, status:'pending' };
      if (previous) list[list.indexOf(previous)] = item; else list.unshift(item); invoiceSaveData('invoices', list); committed172 = true; editingInvoiceId = null; get('inv-save').textContent = 'ذخیره فاکتور'; get('inv-message').textContent = '✅ فاکتور ذخیره شد؛ در فهرست فاکتورها آن را بررسی و تأیید کن.'; get('inv-number').value = ''; get('inv-save').disabled = true; invoiceShowList(get('inv-search').value); if (typeof addSaved164 === 'function' && typeof tab !== 'undefined' && tab === 'add') setTimeout(() => addSaved164('invoice'), 0);
    } catch (error) { get('inv-message').textContent = '⚠️ ' + (error.message || 'ذخیره فاکتور انجام نشد'); }
    finally { saveButton.disabled = committed172; }
  };
  invoiceShowList();
}
