'use strict';
let addMode164 = 'menu', addSavedMode164 = '', addReceiptFilter164 = 'all';
let addInline173b = '';
function addGroups173b() {
  const row = (key, title) => '<details class="add-row-173b" data-inline-173b="' + key + '"><summary><span>' + title + '</span><span aria-hidden="true">▾</span></summary><div class="add-form-173b"></div></details>';
  return '<div class="add-groups-173b"><div class="add-group-label-173b">افراد</div>' + row('contact','ثبت مخاطب') + (featureOn('assistant') ? row('assistant','ثبت دستیار / همکار') : '') + (featureOn('assistant') ? '<div class="add-group-label-173b">کار</div>' + row('work','ثبت کارکرد') : '') + (featureOn('reminder') ? '<div class="add-group-label-173b">یادآوری</div>' + row('reminder','ثبت یادآوری') : '') + '</div>';
}
function addMount173b(details) {
  const key = details.dataset.inline173b, host = details.querySelector('.add-form-173b');
  if (!host) return;
  host.replaceChildren(); addInline173b = key;
  const temp = document.createElement('div');
  if (key === 'contact') {
    cv = 'list'; pe = 'new'; pEditing = true;
    temp.innerHTML = contactsHtml();
    const form = temp.querySelector('#pform'); if (form) host.appendChild(form);
  } else if (key === 'assistant') {
    const previous = lp; lp = null; temp.innerHTML = loansHtml(); lp = previous;
    const form = temp.querySelector('#nadd')?.closest('details');
    if (form) { form.open = true; host.appendChild(form); }
  } else if (key === 'work') {
    const names = Object.keys(cols()); lp = names.includes(lp) ? lp : '';
    const label = document.createElement('label'); label.textContent = 'دستیار / همکار';
    const select = document.createElement('select'); select.id = 'add-work-person-173b';
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'انتخاب دستیار'; select.appendChild(empty);
    names.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; select.appendChild(option); });
    select.value = lp || ''; label.appendChild(select); host.appendChild(label);
    const formHost = document.createElement('div'); host.appendChild(formHost);
    const showWork = () => { lp = select.value; formHost.replaceChildren(); if (!lp) return; temp.innerHTML = loansHtml(); const form = temp.querySelector('#wadd')?.closest('details'); if (form) { form.open = true; formHost.appendChild(form); } };
    select.addEventListener('change', showWork); showWork();
    if (!names.length) { const hint = document.createElement('div'); hint.className = 'mut'; hint.textContent = 'ابتدا یک دستیار ثبت کن.'; host.appendChild(hint); }
  } else if (key === 'reminder') {
    temp.innerHTML = remHtml(); const form = temp.querySelector('#rt')?.closest('.card');
    if (form) { host.appendChild(form); remBind(); }
  }
  const close = document.createElement('button'); close.type = 'button'; close.className = 'sec add-close-173b'; close.textContent = 'بستن'; close.addEventListener('click', () => { details.open = false; }); host.appendChild(close);
}
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('toggle', event => {
  const details = event.target;
  if (!details.matches?.('details[data-inline-173b]')) return;
  if (details.open) {
    document.querySelectorAll('details[data-inline-173b]').forEach(other => { if (other !== details) { other.open = false; other.querySelector('.add-form-173b')?.replaceChildren(); } });
    addMount173b(details);
  } else {
    details.querySelector('.add-form-173b')?.replaceChildren();
    if (addInline173b === details.dataset.inline173b) addInline173b = '';
  }
}, true);
function addTileDefinitions164() {
  return [
    { id:'sms', title:'چسباندن پیامک', description:'ثبت پیامک بانکی', color:'#12815f', icon:'<path d="M4 5h16v11H9l-5 4V5z"/><path d="M7 9h10M7 12h7"/>' },
    { id:'manual', title:'ثبت دستی', description:'ثبت هزینه یا درآمد', color:'#2563eb', icon:'<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/><path d="M14 7l3 3"/>' },
    { id:'invoice', title:'فاکتور جدید', description:'ثبت خدمات یا فروش', color:'#8249ad', icon:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>' },
    { id:'receipt', title:'رسید', description:'ثبت رسید بانکی', color:'#d97706', icon:'<path d="M3 7h4l2-3h6l2 3h4v12H3V7z"/><circle cx="12" cy="13" r="3"/>' }
  ];
}
function addTopicFor164(mode) { return mode === 'invoice' ? 'invoices' : mode === 'receipt' ? 'receipts' : 'expenses'; }
function addTileVisible164(mode, enabled) { return mode === 'invoice' ? enabled('invoice') : mode === 'receipt' || mode === 'sms' ? enabled('sms') : true; }
function addOpen164(mode) { addMode164 = mode; topic = addTopicFor164(mode); tab = 'add'; render(); window.scrollTo(0, 0); }
function addSaved164(mode) { addSavedMode164 = mode; addMode164 = 'saved'; topic = 'expenses'; tab = 'add'; render(); window.scrollTo(0, 0); }
function addManualFields164(card) {
  const more = document.createElement('details'); more.id = 'manual-more-164'; more.className = 'manual-more-164';
  more.innerHTML = '<summary>جزئیات بیشتر</summary><div class="mut">دسته، نوع، حساب، تاریخ و توضیحات اختیاری</div>';
  for (const id of ['mc','mt','mp','pl2','xs','mac']) { const node = document.getElementById(id); if (node) more.appendChild(node); }
  const last = tx.find(t => t.account && !t.ghost), account = document.getElementById('mac');
  if (account && last) account.value = accounts[last.account] || last.bank || account.value;
  more.insertAdjacentHTML('beforeend', persianDateFields('manual-date-164') + '<input id="manual-note-164" placeholder="یادداشت (اختیاری)"><input id="manual-link-164" placeholder="پیوند (اختیاری)">');
  const saveButton = document.getElementById('mg'); saveButton.before(more); saveButton.textContent = 'ذخیره'; more.open = false;
}
function addPage164() {
  if (tab !== 'add') return;
  const bar = document.getElementById('add-sections'); if (bar) bar.hidden = true;
  const el = document.getElementById('app'); if (!el || (!document.getElementById('sms') && !document.getElementById('invoice-card'))) return;
  const children = [...el.children], invoice = document.getElementById('invoice-card'), manual = document.getElementById('manual-entry-159');
  const sms = document.getElementById('sms')?.closest('.card');
  if ((addMode164 === 'manual' || (addMode164 === 'menu' && addReceiptFilter164 === 'all')) && manual) addManualFields164(manual);
  let chosen = addMode164 === 'manual' ? manual : addMode164 === 'sms' || addMode164 === 'receipt' ? sms : addMode164 === 'invoice' ? invoice : null;
  if (addMode164 === 'receipt') chosen = null;
  for (const child of children) child.hidden = !(chosen && (child === chosen || child.contains(chosen))) && addMode164 !== 'receipt';
  if (chosen && chosen.tagName === 'DETAILS') chosen.open = true;
  if (addMode164 === 'invoice' && invoice) { invoice.hidden = false; invoice.open = true; const search = document.getElementById('invoice-search-panel'); if (search) search.hidden = true; }
  if (addMode164 === 'receipt') { for (const child of children) { child.hidden = child !== sms && !child.contains(sms); if (!child.hidden && child.tagName === 'DETAILS') child.open = true; } }
  if (addMode164 === 'menu') {
    const labels173b = {sms:['💬','ثبت پیامک'],manual:['✍️','ثبت دستی'],invoice:['🧾','فاکتور جدید'],receipt:['📎','ثبت رسید']};
    const tiles = addTileDefinitions164().filter(t => addTileVisible164(t.id, featureOn)).map(t => '<button type="button" class="add-tile-164" data-add-mode="' + t.id + '"><span class="add-icon-164" style="--tile:' + t.color + '" aria-hidden="true">' + labels173b[t.id][0] + '</span><span><b>' + labels173b[t.id][1] + '</b><small>' + t.description + '</small></span></button>').join('');
    el.insertAdjacentHTML('afterbegin', '<div id="add-hub-164"><div class="add-grid-164">' + tiles + '</div>' + (addReceiptFilter164 === 'all' ? addGroups173b() : '') + '</div>');
    if (addReceiptFilter164 === 'receipt' && featureOn('sms')) { const grid = el.querySelector('.add-grid-164'); grid.hidden = true; el.querySelector('#add-hub-164').insertAdjacentHTML('beforeend', receiptArchiveHtml()); const box = el.querySelector('#add-hub-164 details'); box.open = true; receiptArchiveRender(''); document.getElementById('receipt-archive-search').oninput = e => receiptArchiveRender(e.target.value); if (!receiptArchiveItems().length) document.getElementById('receipt-archive-results').innerHTML = '<div class="mut">هنوز چیزی ثبت نشده</div><button type="button" data-add-mode="receipt">شروع</button>'; }
  } else if (addMode164 === 'saved') {
    el.insertAdjacentHTML('afterbegin', '<div class="card add-saved-164" role="status"><b>ذخیره شد ✅</b><div class="row"><button type="button" data-add-action="again">یکی دیگر</button><button type="button" class="sec" data-add-action="back">بازگشت</button></div></div>');
  } else {
    el.insertAdjacentHTML('afterbegin', '<button type="button" class="sec add-back-164" data-add-action="back">بازگشت</button>');
  }
}
