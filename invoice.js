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
function invoiceSaveData(key, value) { localStorage.setItem(key, JSON.stringify(value)); localStorage.setItem('dirty', '1'); }
function invoiceLineHtml() {
  return `<div class="invoice-line" style="border-top:1px solid #e5e7eb;padding-top:8px"><select class="inv-service-choice"><option value="">انتخاب خدمت یا کالا از فهرست</option>${invoiceSelectOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</select><input class="inv-item" list="invoice-items" placeholder="نام خدمت یا کالا"><div class="row"><label style="flex:0 0 75px">تعداد<input class="inv-qty" inputmode="numeric" value="1" aria-label="تعداد"></label><label style="flex:1">مبلغ واحد (تومان)<input class="inv-price" inputmode="numeric" placeholder="مبلغ به تومان"></label></div><div class="row"><button type="button" class="sec inv-save-item">ذخیره نام و قیمت در فهرست</button><button type="button" class="sec inv-remove-item">حذف ردیف</button></div></div>`;
}
function invoicePaymentLabel(method) { return ({unpaid:'نسیه / پرداخت نشده',cash:'نقدی',transfer:'کارت به کارت',pos:'کارت‌خوان'})[method] || 'ثبت نشده'; }
function invoiceHtml() {
  const contacts = load('ppl', []), peopleList = Array.isArray(contacts) ? contacts : [], assistants = Object.keys(cols());
  return `<details class="card" id="invoice-card"><summary><b>🧾 ثبت و جست‌وجوی فاکتور</b></summary>
    <div class="mut">ثبت فاکتور به‌تنهایی پرداخت بانکی یا کارکرد دستیار ثبت نمی‌کند.</div>
    <div class="row"><input id="inv-number" placeholder="شماره فاکتور (اختیاری)"><input id="inv-date" inputmode="numeric" value="${invoiceDate()}" placeholder="تاریخ 1405/08/17"></div>
    <div class="mut">انتخاب تاریخ شمسی:</div><div class="row"><select id="inv-jyear" aria-label="سال شمسی"></select><select id="inv-jmonth" aria-label="ماه شمسی"></select><select id="inv-jday" aria-label="روز شمسی"></select></div>
    <div class="row"><button type="button" class="sec inv-day" data-days="0">امروز</button><button type="button" class="sec inv-day" data-days="1">دیروز</button><button type="button" class="sec inv-day" data-days="2">پریروز</button></div>
    <details><summary>انتخاب مخاطب از پرونده‌ها (اختیاری)</summary><select id="inv-contact-group"><option value="">همه گروه‌ها</option>${[...new Set(peopleList.flatMap(person => Array.isArray(person.tags) ? person.tags : []))].map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join('')}<option value="__untagged">بدون گروه</option></select><select id="inv-contact"><option value="">انتخاب نکن؛ ورود دستی</option>${peopleList.map((person, index) => `<option value="${index}">${esc(person.name || '')}${person.phone ? ' · ' + esc(person.phone) : ''}</option>`).join('')}</select><button type="button" class="sec" id="inv-contact-cancel">بازگشت و ورود دستی</button></details>
    <input id="inv-customer" placeholder="نام راننده، صاحب خودرو یا خریدار"><input id="inv-phone" inputmode="tel" placeholder="شماره تماس">
    <select id="inv-car"><option value="">انتخاب خودروی مخاطب (اختیاری)</option></select>
    <select class="inv-car-choice" data-target="inv-car-type"><option value="">انتخاب نوع خودرو</option>${invoiceSelectOptions(load('carTypes', []))}</select><input id="inv-car-type" placeholder="نوع خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-model"><option value="">انتخاب مدل خودرو</option>${invoiceSelectOptions(carModels())}</select><input id="inv-model" placeholder="مدل خودرو (یا ورود دستی)"><select class="inv-car-choice" data-target="inv-color"><option value="">انتخاب رنگ خودرو</option>${invoiceSelectOptions(load('carColors', []))}</select><input id="inv-color" placeholder="رنگ خودرو (یا ورود دستی)"><label class="mut">پلاک (برای خودرو سنگین حرف ع را انتخاب کن)</label><div class="row" dir="ltr"><input id="inv-plate-left" inputmode="numeric" maxlength="2" placeholder="دو رقم" aria-label="دو رقم پلاک"><select id="inv-plate-letter" aria-label="حرف پلاک"><option value="">حرف</option>${'ابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی'.split('').map(c => `<option>${c}</option>`).join('')}</select><input id="inv-plate-mid" inputmode="numeric" maxlength="3" placeholder="سه رقم" aria-label="سه رقم پلاک"><input id="inv-plate-iran" inputmode="numeric" maxlength="2" placeholder="ایران" aria-label="کد ایران"></div><input id="inv-plate" placeholder="پلاک کامل (یا ورود دستی)"><div class="mut">فهرست مدل، رنگ و نوع خودرو در تنظیمات ← برچسب‌ها قابل ویرایش است.</div>
    <select id="inv-kind"><option value="خدمات">خدمات</option><option value="فروش">فروش کالا</option></select>
    <datalist id="invoice-items">${invoiceOptions([...load('svq', []), ...invoiceCatalog().map(item => item.name)])}</datalist>
    <div id="invoice-lines">${invoiceLineHtml()}</div><button type="button" id="inv-add-line" class="sec">＋ افزودن خدمت یا کالا</button>
    <div id="inv-total" style="margin:10px 0;font-weight:bold">جمع: ۰ تومان</div>
    <b>نحوه تسویه</b><select id="inv-payment"><option value="unpaid">نسیه / پرداخت نشده</option><option value="cash">نقدی</option><option value="transfer">کارت به کارت</option><option value="pos">کارت‌خوان</option></select><select id="inv-pay-contact"><option value="">انتخاب دریافت‌کننده از مخاطبان (اختیاری)</option>${peopleList.map((person,index) => `<option value="${index}">${esc(person.name || '')}</option>`).join('')}</select><input id="inv-pay-name" placeholder="نام صاحب کارت یا دریافت‌کننده"><input id="inv-pay-card" inputmode="numeric" placeholder="شماره کارت یا حساب (اختیاری)"><input id="inv-pay-note" placeholder="توضیحات تسویه، کارت‌خوان یا پیگیری"><div class="mut">این بخش روش پرداخت را در فاکتور ثبت می‌کند؛ خودکار مانده بانکی یا حساب مخاطب را تغییر نمی‌دهد.</div>
    <select id="inv-assistant"><option value="">بدون دستیار</option>${assistants.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select>
    <select id="inv-share-mode"><option value="percent">سهم درصدی</option><option value="fixed">مبلغ ثابت به تومان</option></select><input id="inv-share" inputmode="decimal" placeholder="درصد یا مبلغ سهم دستیار"><div id="inv-share-result" class="mut"></div>
    <div class="row"><button type="button" id="inv-save">ذخیره فاکتور</button><button type="button" class="sec" id="inv-cancel">انصراف و بستن فرم</button></div><div id="inv-message" class="mut" aria-live="polite"></div>
    <hr><b>فاکتورهای ثبت‌شده</b><input id="inv-search" placeholder="جست‌وجوی نام، تلفن، پلاک یا شماره فاکتور"><div id="inv-results"></div></details>`;
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
    total.textContent = 'جمع: ' + result.total.toLocaleString('fa-IR') + ' تومان';
    share.textContent = document.getElementById('inv-assistant').value ? 'سهم دستیار: ' + result.share.toLocaleString('fa-IR') + ' تومان' : '';
  } catch (_) { total.textContent = 'جمع پس از تکمیل ردیف‌ها نمایش داده می‌شود.'; share.textContent = ''; }
}
function invoiceShowList(query = '') {
  const box = document.getElementById('inv-results'); if (!box) return;
  const term = nrm(pfa(query));
  const list = invoiceList().filter(item => !term || [item.number, item.customer, item.phone, item.plate, item.model, item.date, ...(item.lines || []).map(line => line.name)].some(value => nrm(pfa(value || '')).includes(term)));
  box.innerHTML = list.length ? `<div class="mut">${list.length.toLocaleString('fa-IR')} فاکتور · جمع ${list.reduce((sum,item)=>sum+(Number(item.total)||0),0).toLocaleString('fa-IR')} تومان</div>` + list.map(item => `<details style="border-top:1px solid #e5e7eb;padding:10px 0"><summary><b>${esc(item.customer || 'بدون نام')}</b> · ${esc(item.number)} · ${Number(item.total || 0).toLocaleString('fa-IR')} تومان</summary><div class="mut">${esc(item.date)} · ${esc(item.phone)} · ${esc(item.plate)} · ${esc(item.model)} · ${esc(item.color)} · ${esc(item.carType)}</div><div class="mut">تسویه: ${esc(invoicePaymentLabel(item.payment?.method))}${item.payment?.recipient ? ' · دریافت‌کننده: ' + esc(item.payment.recipient) : ''}${item.payment?.account ? ' · کارت / حساب: ' + esc(item.payment.account) : ''}${item.payment?.note ? ' · ' + esc(item.payment.note) : ''}</div><div>${(item.lines || []).map(line => `<div>${esc(line.name)} · ${Number(line.quantity).toLocaleString('fa-IR')} × ${Number(line.price).toLocaleString('fa-IR')} تومان</div>`).join('')}</div>${item.assistant ? `<div class="mut">دستیار: ${esc(item.assistant)} · سهم ${Number(item.share).toLocaleString('fa-IR')} تومان</div><button type="button" class="sec invoice-work" data-id="${esc(item.id)}">ثبت سهم در کارکرد دستیار</button>` : ''}<button type="button" class="sec invoice-print" data-id="${esc(item.id)}">نمایش و چاپ فاکتور</button><button type="button" class="sec invoice-delete" data-id="${esc(item.id)}">حذف فاکتور</button></details>`).join('') : '<div class="mut">فاکتوری پیدا نشد.</div>';
}
function invoicePrint(item) {
  const popup = window.open('', '_blank');
  if (!popup) { alert('پنجره چاپ باز نشد؛ اجازه باز شدن پنجره را بررسی کن.'); return; }
  const lines = item.lines.map(line => `<tr><td>${esc(line.name)}</td><td>${Number(line.quantity).toLocaleString('fa-IR')}</td><td>${Number(line.price).toLocaleString('fa-IR')}</td><td>${(line.quantity * line.price).toLocaleString('fa-IR')}</td></tr>`).join('');
  popup.document.write(`<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>فاکتور ${esc(item.number)}</title><style>body{font-family:Tahoma,sans-serif;padding:24px;line-height:1.9}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:right}@media print{button{display:none}}</style></head><body><h2>فاکتور ${esc(item.kind)}</h2><div>شماره: ${esc(item.number)} · تاریخ: ${esc(item.date)}</div><div>مشتری: ${esc(item.customer)} · تماس: ${esc(item.phone)}</div><div>خودرو: ${[item.plate,item.model,item.color,item.carType].map(esc).filter(Boolean).join(' · ')}</div><table><thead><tr><th>شرح</th><th>تعداد</th><th>قیمت واحد (تومان)</th><th>مبلغ (تومان)</th></tr></thead><tbody>${lines}</tbody></table><h3>جمع: ${Number(item.total).toLocaleString('fa-IR')} تومان</h3><button onclick="window.print()">چاپ / ذخیره PDF</button></body></html>`);
  popup.document.close();
}
function invoiceBind() {
  const card = document.getElementById('invoice-card'); if (!card) return;
  const contacts = load('ppl', []), peopleList = Array.isArray(contacts) ? contacts : [];
  const get = id => document.getElementById(id);
  const todayYear = Number(invoiceDate().slice(0, 4));
  for (const [id, start, end] of [['inv-jyear', todayYear - 20, todayYear + 10], ['inv-jmonth', 1, 12], ['inv-jday', 1, 31]]) get(id).innerHTML = Array.from({length:end-start+1}, (_,i) => `<option value="${start+i}">${(start+i).toLocaleString('fa-IR')}</option>`).join('');
  const dateSelectors = () => { const m = get('inv-date').value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (m) for (const [id, value] of [['inv-jyear',m[1]],['inv-jmonth',m[2]],['inv-jday',m[3]]]) get(id).value = String(Number(value)); };
  dateSelectors();
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
    for (const id of ['inv-number', 'inv-customer', 'inv-phone', 'inv-plate', 'inv-plate-left', 'inv-plate-mid', 'inv-plate-iran', 'inv-model', 'inv-color', 'inv-car-type', 'inv-share', 'inv-search', 'inv-pay-name', 'inv-pay-card', 'inv-pay-note']) get(id).value = '';
    for (const id of ['inv-contact-group', 'inv-contact', 'inv-car', 'inv-assistant', 'inv-plate-letter', 'inv-payment', 'inv-pay-contact']) get(id).selectedIndex = 0;
    get('inv-kind').selectedIndex = 0; get('inv-share-mode').selectedIndex = 0; get('inv-date').value = invoiceDate(); dateSelectors(); get('invoice-lines').innerHTML = invoiceLineHtml(); get('inv-message').textContent = ''; get('inv-save').disabled = false; invoiceRefreshTotal(); invoiceShowList(); card.open = false;
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
  card.addEventListener('input', event => { if (event.target.id !== 'inv-search') get('inv-save').disabled = false; if (event.target.classList.contains('inv-price')) invoiceAmountInput(event.target); if (event.target.matches('.inv-price,.inv-qty,#inv-share')) invoiceRefreshTotal(); });
  card.addEventListener('change', event => { if (event.target.id !== 'inv-search') get('inv-save').disabled = false; if (event.target.classList.contains('inv-car-choice') && event.target.value) get(event.target.dataset.target).value = event.target.value; const isChoice = event.target.classList.contains('inv-service-choice'); if (!isChoice && !event.target.classList.contains('inv-item')) return; const row = event.target.closest('.invoice-line'); if (isChoice && event.target.value) row.querySelector('.inv-item').value = event.target.value; const item = invoiceCatalog().find(entry => entry.name === row.querySelector('.inv-item').value.trim()); if (item) row.querySelector('.inv-price').value = Number(item.price).toLocaleString('en-US'); else if (isChoice && event.target.value) row.querySelector('.inv-price').value = ''; invoiceRefreshTotal(); });
  card.addEventListener('click', event => {
    const day = event.target.closest('.inv-day'); if (day) { get('inv-date').value = invoiceDate(Number(day.dataset.days)); dateSelectors(); return; }
    const remove = event.target.closest('.inv-remove-item'); if (remove) { if (document.querySelectorAll('#invoice-lines .invoice-line').length > 1) remove.closest('.invoice-line').remove(); else alert('حداقل یک ردیف لازم است'); invoiceRefreshTotal(); return; }
    const catalog = event.target.closest('.inv-save-item'); if (catalog) { const row = catalog.closest('.invoice-line'), name = row.querySelector('.inv-item').value.trim(), price = invoiceDigits(row.querySelector('.inv-price').value); if (!name || price === null) { alert('نام و قیمت را وارد کن'); return; } const items = invoiceCatalog(), old = items.find(item => item.name === name); if (old && !confirm('قیمت ثبت‌شده برای «' + name + '» تغییر کند؟')) return; if (old) old.price = price; else items.push({ name, price }); invoiceSaveData('invoiceCatalog', items); get('invoice-items').innerHTML = invoiceOptions([...load('svq', []), ...items.map(item => item.name)]); get('inv-message').textContent = 'نام و قیمت در فهرست ذخیره شد.'; return; }
    const print = event.target.closest('.invoice-print'); if (print) { const item = invoiceList().find(entry => entry.id === print.dataset.id); if (item) invoicePrint(item); return; }
    const deleted = event.target.closest('.invoice-delete'); if (deleted) { const list = invoiceList(), item = list.find(entry => entry.id === deleted.dataset.id); if (!item) return; const linked = tx.some(entry => entry.invoiceId === item.id); if (!confirm('فاکتور «' + item.number + '» حذف شود؟' + (linked ? ' کارکرد دستیار که قبلاً ثبت شده حفظ می‌شود و جداگانه باید بررسی شود.' : ''))) return; invoiceSaveData('invoices', list.filter(entry => entry.id !== item.id)); invoiceShowList(get('inv-search').value); get('inv-message').textContent = 'فاکتور حذف شد.'; return; }
    const work = event.target.closest('.invoice-work'); if (work) { const item = invoiceList().find(entry => entry.id === work.dataset.id); if (!item || !item.assistant || !item.share) { alert('سهم دستیار باید بیشتر از صفر باشد'); return; } if (tx.some(entry => entry.invoiceId === item.id)) { alert('کارکرد این فاکتور قبلاً ثبت شده است.'); return; } if (!confirm('سهم ' + item.share.toLocaleString('fa-IR') + ' تومان برای «' + item.assistant + '» در کارکرد ثبت شود؟')) return; const source = tx.find(entry => entry.account) || {}; tx.push({ id: Date.now() + Math.random(), invoiceId: item.id, ghost: true, bank: source.bank || '', account: source.account || '', type: 'credit', amount: item.share * 10, balance: null, date: item.date + ' ' + nowStr().slice(11), cat: 'کارکرد همکار', loan: 'share', person: item.assistant, desc: 'فاکتور ' + item.number + (item.customer ? ' · ' + item.customer : ''), pending: false }); save(); alert('کارکرد ثبت شد.'); return; }
  });
  get('inv-save').onclick = () => {
    try {
      const lines = invoiceFormLines(), assistant = get('inv-assistant').value, mode = get('inv-share-mode').value, result = invoiceTotals(lines, mode, get('inv-share').value, assistant);
      const date = get('inv-date').value.trim().replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
      const match = date.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (!match || Number(match[2]) < 1 || Number(match[2]) > 12 || Number(match[3]) < 1 || Number(match[3]) > 31) throw new Error('تاریخ را مانند 1405/08/17 وارد کن');
      const pm = Number(match[2]), pd = Number(match[3]); if (pm > 6 && pd > 30) throw new Error('روز انتخاب‌شده در این ماه شمسی معتبر نیست');
      const plateParts = ['inv-plate-left','inv-plate-letter','inv-plate-mid','inv-plate-iran'].map(key => get(key).value.trim()); if (plateParts.some(Boolean) && !plateParts.every(Boolean)) throw new Error('همه بخش‌های پلاک را کامل کن یا همه را خالی بگذار');
      const number = get('inv-number').value.trim() || String(Date.now());
      const list = invoiceList(); if (list.some(item => item.number === number)) throw new Error('این شماره فاکتور قبلاً ثبت شده است');
      const item = { id: 'invoice-' + Date.now() + '-' + Math.random().toString(36).slice(2), number, date: match[1] + '/' + match[2].padStart(2, '0') + '/' + match[3].padStart(2, '0'), customer: get('inv-customer').value.trim(), phone: get('inv-phone').value.trim(), plate: get('inv-plate').value.trim(), model: get('inv-model').value.trim(), color: get('inv-color').value.trim(), carType: get('inv-car-type').value.trim(), kind: get('inv-kind').value, lines, total: result.total, assistant, share: result.share, shareMode: mode, payment: { method: get('inv-payment').value, recipient: get('inv-pay-name').value.trim(), account: get('inv-pay-card').value.trim(), note: get('inv-pay-note').value.trim() }, createdAt: new Date().toISOString() };
      list.unshift(item); invoiceSaveData('invoices', list); get('inv-message').textContent = '✅ فاکتور ذخیره شد. برای ثبت سهم دستیار، آن را در فهرست انتخاب کن.'; get('inv-number').value = ''; get('inv-save').disabled = true; invoiceShowList(get('inv-search').value);
    } catch (error) { get('inv-message').textContent = '⚠️ ' + (error.message || 'ذخیره فاکتور انجام نشد'); }
  };
  invoiceShowList();
}
