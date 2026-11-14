'use strict';
let addMode164 = 'menu', addSavedMode164 = '', addReceiptFilter164 = 'all';
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
  let chosen = addMode164 === 'menu' && addReceiptFilter164 === 'all' ? manual : addMode164 === 'manual' ? manual : addMode164 === 'sms' || addMode164 === 'receipt' ? sms : addMode164 === 'invoice' ? invoice : null;
  if (addMode164 === 'receipt') chosen = null;
  for (const child of children) child.hidden = !(chosen && (child === chosen || child.contains(chosen))) && addMode164 !== 'receipt';
  if (chosen && chosen.tagName === 'DETAILS') chosen.open = true;
  if (addMode164 === 'invoice' && invoice) { invoice.hidden = false; invoice.open = true; const search = document.getElementById('invoice-search-panel'); if (search) search.hidden = true; }
  if (addMode164 === 'receipt') { for (const child of children) { child.hidden = child !== sms && !child.contains(sms); if (!child.hidden && child.tagName === 'DETAILS') child.open = true; } }
  if (addMode164 === 'menu') {
    const tiles = addTileDefinitions164().filter(t => addTileVisible164(t.id, featureOn)).map(t => '<button type="button" class="add-tile-164" data-add-mode="' + t.id + '"><span class="add-icon-164" style="--tile:' + t.color + '"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + t.icon + '</svg></span><span><b>' + t.title + '</b><small>' + t.description + '</small></span></button>').join('');
    el.insertAdjacentHTML('afterbegin', '<div id="add-hub-164"><div class="add-grid-164">' + tiles + '</div></div>');
    if (addReceiptFilter164 === 'receipt' && featureOn('sms')) { const grid = el.querySelector('.add-grid-164'); grid.hidden = true; el.querySelector('#add-hub-164').insertAdjacentHTML('beforeend', receiptArchiveHtml()); const box = el.querySelector('#add-hub-164 details'); box.open = true; receiptArchiveRender(''); document.getElementById('receipt-archive-search').oninput = e => receiptArchiveRender(e.target.value); if (!receiptArchiveItems().length) document.getElementById('receipt-archive-results').innerHTML = '<div class="mut">هنوز چیزی ثبت نشده</div><button type="button" data-add-mode="receipt">شروع</button>'; }
  } else if (addMode164 === 'saved') {
    el.insertAdjacentHTML('afterbegin', '<div class="card add-saved-164" role="status"><b>ذخیره شد ✅</b><div class="row"><button type="button" data-add-action="again">یکی دیگر</button><button type="button" class="sec" data-add-action="back">بازگشت</button></div></div>');
  } else {
    el.insertAdjacentHTML('afterbegin', '<button type="button" class="sec add-back-164" data-add-action="back">بازگشت</button>');
  }
}
