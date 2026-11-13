if (!directReceiveRecover()) throw new Error('Pending direct receive recovery failed');
if (directReceiveRecovered) setTimeout(() => alert('دریافت قبلی کامل نشده بود؛ اطلاعات قبلی این دستگاه برگردانده شد.'), 0);
const $ = s => document.querySelector(s);
const lsj = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) && v.length ? v : d; } catch { return d; } };
const DEFAULT_CATS = ['خرید', 'خوراک', 'پوشاک', 'مسکن', 'تعمیر', 'درمان', 'قبض', 'قسط', 'هدیه', 'سوخت', 'بلیط'];
const DEFAULT_INC = ['فروش', 'مشتری', 'حقوق', 'سایر'];
const CATS = lsj('cats', [...DEFAULT_CATS]);
const INC = lsj('icats', [...DEFAULT_INC]);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const BACKUP_KEYS = ['tx', 'accounts', 'rem', 'log', 'ppl', 'pplIgnored', 'prc', 'receiptArchive', 'invoices', 'invoiceCatalog', 'cols', 'pjobs', 'cats', 'icats', 'ctypes', 'svq', 'carModels', 'carColors', 'carTypes', 'defaultCustomerType', 'job', 'work', 'bizMode', 'budgets', 'features', 'dataOwner', 'sel', 'ord', 'ord_settings', 'ord_add', 'txDel', 'remDel', 'logDel', 'delAcc', 'nameRej', 'xrej', 'sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet', 'legacyInboxImported'];
function makeFullBackup() {
  const data = {};
  BACKUP_KEYS.forEach(key => { const value = localStorage.getItem(key); if (value !== null) data[key] = value; });
  if (!('dataOwner' in data)) data.dataOwner = '';
  if (!('tx' in data)) data.tx = JSON.stringify(tx);
  if (!('accounts' in data)) data.accounts = JSON.stringify(accounts);
  return { format: 'expense-app-backup', version: 1, createdAt: new Date().toISOString(), data };
}
function validateFullBackup(backup) {
  if (!backup || backup.format !== 'expense-app-backup' || backup.version !== 1 || !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) throw new Error('فایل پشتیبان کامل معتبر نیست');
  for (const [key, value] of Object.entries(backup.data)) if (!BACKUP_KEYS.includes(key) || typeof value !== 'string') throw new Error('فایل پشتیبان شامل اطلاعات نامعتبر است');
  const parse = key => { try { return JSON.parse(backup.data[key]); } catch { throw new Error('اطلاعات «' + key + '» در پشتیبان معتبر نیست'); } };
  if (!Array.isArray(parse('tx'))) throw new Error('فهرست تراکنش‌ها معتبر نیست');
  const acc = parse('accounts'); if (!acc || typeof acc !== 'object' || Array.isArray(acc)) throw new Error('اطلاعات حساب‌ها معتبر نیست');
  for (const key of ['rem', 'log', 'ppl', 'pplIgnored', 'prc', 'receiptArchive', 'invoices', 'invoiceCatalog', 'cats', 'icats', 'ctypes', 'svq', 'carModels', 'carColors', 'carTypes', 'txDel', 'remDel', 'logDel', 'delAcc', 'nameRej', 'xrej', 'ord_settings', 'ord_add', 'legacyInboxImported']) if (key in backup.data && !Array.isArray(parse(key))) throw new Error('فهرست «' + key + '» معتبر نیست');
  for (const key of ['cols', 'pjobs', 'budgets', 'features']) if (key in backup.data) { const value = parse(key); if (!value || typeof value !== 'object' || Array.isArray(value) || (key === 'budgets' && Object.values(value).some(v => typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0)) || (key === 'features' && Object.values(value).some(v => typeof v !== 'boolean'))) throw new Error('اطلاعات «' + key + '» معتبر نیست'); }
  if ('bizMode' in backup.data && !['0', '1'].includes(backup.data.bizMode)) throw new Error('حالت کسب‌وکار معتبر نیست');
  return backup.data;
}
let tx = load('tx', []);
tx.forEach(t => { if ((t.loan === 'wage' || t.loan === 'share') && t.cat === 'قرض') t.cat = 'کارکرد همکار'; });
let accounts = load('accounts', {});
// نسخهٔ کامل پیش از ادغام روی همین دستگاه می‌ماند؛ ادغام بدون ثبت آن شروع نمی‌شود.
const CATEGORY_MERGE_BACKUP = 'categoryMerge155Backup';
const CATEGORY_MERGE_MAP = { 'خرید': 'خرید', 'هزینه': 'خرید', 'سایر': 'خرید', 'سوپرمارکت': 'خرید' };
function migrateCategoriesOnce() {
  if (localStorage.getItem('categoryMerge155Done') === '1') return;
  // اگر برنامه هنگام نوشتن بسته شد، اول وضعیت پیش از ادغام را برگردان.
  const interrupted = localStorage.getItem('categoryMerge155InProgress');
  if (interrupted) {
    try {
      const data = validateFullBackup(JSON.parse(localStorage.getItem(CATEGORY_MERGE_BACKUP))), journal = JSON.parse(interrupted);
      localStorage.setItem('tx', data.tx);
      if (data.cats === undefined) localStorage.removeItem('cats'); else localStorage.setItem('cats', data.cats);
      if (journal.dirty === null) localStorage.removeItem('dirty'); else localStorage.setItem('dirty', journal.dirty);
      tx = JSON.parse(data.tx); CATS.splice(0, CATS.length, ...lsj('cats', [...DEFAULT_CATS]));
      localStorage.removeItem('categoryMerge155InProgress');
    } catch (error) { console.error('بازگردانی ادغام ناتمام انجام نشد:', error); return; }
  }
  const oldTx = localStorage.getItem('tx'), oldCats = localStorage.getItem('cats'), oldDirty = localStorage.getItem('dirty');
  try {
    const saved = JSON.stringify(makeFullBackup());
    validateFullBackup(JSON.parse(saved));
    localStorage.setItem(CATEGORY_MERGE_BACKUP, saved);
    if (localStorage.getItem(CATEGORY_MERGE_BACKUP) !== saved) throw new Error('پشتیبان ذخیره نشد');
    localStorage.setItem('categoryMerge155InProgress', JSON.stringify({ dirty: oldDirty }));
    const next = tx.map(t => t.type === 'debit' && !t.loan && !t.xfer && Object.prototype.hasOwnProperty.call(CATEGORY_MERGE_MAP, t.cat) ? { ...t, cat: CATEGORY_MERGE_MAP[t.cat] } : t);
    const categories = [...new Set(CATS.map(c => Object.prototype.hasOwnProperty.call(CATEGORY_MERGE_MAP, c) ? CATEGORY_MERGE_MAP[c] : c))];
    localStorage.setItem('tx', JSON.stringify(next));
    localStorage.setItem('cats', JSON.stringify(categories));
    localStorage.setItem('dirty', '1');
    localStorage.setItem('categoryMerge155Done', '1');
    localStorage.removeItem('categoryMerge155InProgress');
    tx = next; CATS.splice(0, CATS.length, ...categories);
  } catch (error) {
    try { for (const [key, value] of [['tx', oldTx], ['cats', oldCats], ['dirty', oldDirty]]) value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); localStorage.removeItem('categoryMerge155Done'); localStorage.removeItem('categoryMerge155InProgress'); } catch (_) {}
    console.error('ادغام دسته‌ها انجام نشد:', error);
  }
}
function restoreCategoriesBeforeMerge() {
  const snapshot = JSON.parse(localStorage.getItem(CATEGORY_MERGE_BACKUP) || 'null');
  const data = validateFullBackup(snapshot), before = JSON.parse(data.tx);
  const oldById = new Map(before.map(t => [String(t.id), t]));
  const restored = tx.map(t => { const old = oldById.get(String(t.id)); return old && old.type === 'debit' && !old.loan && !old.xfer && Object.prototype.hasOwnProperty.call(CATEGORY_MERGE_MAP, old.cat) && t.cat === CATEGORY_MERGE_MAP[old.cat] ? { ...t, cat: old.cat } : t; });
  const oldCats = data.cats ? JSON.parse(data.cats) : ['خرید', 'هزینه', 'خوراک', 'پوشاک', 'مسکن', 'تعمیر', 'درمان', 'قبض', 'قسط', 'هدیه', 'سوخت', 'بلیط', 'سوپرمارکت', 'سایر'];
  const categories = [...new Set([...oldCats, ...CATS])];
  const oldTx = localStorage.getItem('tx'), currentCats = localStorage.getItem('cats'), oldDirty = localStorage.getItem('dirty');
  try {
    localStorage.setItem('tx', JSON.stringify(restored)); localStorage.setItem('cats', JSON.stringify(categories)); localStorage.setItem('dirty', '1');
  } catch (error) {
    for (const [key, value] of [['tx', oldTx], ['cats', currentCats], ['dirty', oldDirty]]) value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
    throw error;
  }
  tx = restored; CATS.splice(0, CATS.length, ...categories);
}
migrateCategoriesOnce();
const tomb = ids => { const g = JSON.parse(localStorage.getItem('txDel') || '[]'); ids.forEach(i => g.push(String(i))); localStorage.setItem('txDel', JSON.stringify([...new Set(g)].slice(-500))); };
const save = () => { localStorage.setItem('tx', JSON.stringify(tx)); localStorage.setItem('accounts', JSON.stringify(accounts)); localStorage.setItem('dirty', '1'); push(); };
const toman = r => Math.round(r / 10).toLocaleString('fa-IR');
let undo = [];
const snap = label => undo.push({ label, tx: JSON.parse(JSON.stringify(tx)), accounts: { ...accounts }, del: localStorage.getItem('delAcc') || '[]' });
const markDel = k => { const d = JSON.parse(localStorage.getItem('delAcc') || '[]'); d.push(k); localStorage.setItem('delAcc', JSON.stringify(d)); };
const accName = a => accounts[a] || (a ? '…' + a.slice(-4) : 'نامشخص');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let log = load('log', []);
const saveLog = () => { localStorage.setItem('log', JSON.stringify(log.slice(0, 100))); localStorage.setItem('dirty', '1'); push(); };
let banner = '';
let tab = 'home', month = null, topic = 'expenses';
const visibleRem157 = new Set();
function bizEnabled() { const v = localStorage.getItem('bizMode'); return v === '1' || (v !== '0' && !!localStorage.getItem('job')); }
const FEATURE_LABELS = { assistant: 'کارکرد همکار و دستیار', invoice: 'مشتری و فاکتور', loan: 'قرض و طلب', reminder: 'یادآور و اقساط', budget: 'بودجه', sms: 'پیامک بانکی', vehicle: 'خودرو (مدل، رنگ، نوع)' };
function featureOn(name) { const f = load('features', {}); return !f || typeof f !== 'object' || Array.isArray(f) || f[name] !== false; }
let welcomeDismissed = false;

// انتقال بین حساب‌های خودم
const toMin = d => { d = String(d).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)); const m = d.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/); if (!m) return 1e12; return ((+m[1] * 372 + +m[2] * 31 + +m[3]) * 24 + (+m[4] || 0)) * 60 + (+m[5] || 0); };
function nowStr() {
  const n = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const g = t => n.find(x => x.type === t).value;
  return `${g('year')}/${g('month')}/${g('day')} ${g('hour')}:${g('minute')}`;
}
function markX(d, c) {
  d.xfer = c.xfer = true; d.pending = c.pending = false; d.to = c.account; c.from = d.account;
  d.cat = c.cat = 'انتقال';
  d.desc = 'انتقال به ' + accName(c.account); c.desc = 'انتقال از ' + accName(d.account);
}
const xrej = () => JSON.parse(localStorage.getItem('xrej') || '[]');
function xsug() {
  const rj = new Set(xrej()), used = new Set(), out = [];
  const free = tx.filter(t => !t.xfer && !t.loan);
  free.filter(t => t.type === 'debit').forEach(d => {
    let best = null, bd = 1e9;
    free.forEach(c => {
      if (c.type !== 'credit' || c.account === d.account || used.has(c.id) || rj.has(d.id + '|' + c.id)) return;
      const dm = Math.abs(toMin(c.date) - toMin(d.date)), fee = d.amount - c.amount;
      if (dm <= 5 && fee >= 0 && fee <= 50000 && dm < bd) { best = c; bd = dm; }
    });
    if (best) { used.add(best.id); out.push({ d, c: best }); }
  });
  return out;
}
function xsugHtml() {
  const L = xsug();
  return L.map(({ d, c }) => `<div class="card" style="border:2px solid #3b82f6"><b>🔁 انتقال بین حساب‌هایت؟</b>
    <div style="margin-top:6px">${badge(d.account)} ← ${badge(c.account)}</div>
    <div class="mut">${toman(c.amount)} تومان${d.amount > c.amount ? ' · کارمزد ' + toman(d.amount - c.amount) : ''} · ${esc(d.date)}</div>
    <div class="row" style="margin-top:8px"><button class="xyes" data-d="${d.id}" data-c="${c.id}">بله، انتقال است</button><button class="sec xno" data-d="${d.id}" data-c="${c.id}">نه</button></div></div>`).join('');
}
document.addEventListener('click', e => {
  const b = e.target.closest('.xyes,.xno'); if (!b) return;
  const d = tx.find(x => String(x.id) === b.dataset.d), c = tx.find(x => String(x.id) === b.dataset.c);
  if (b.classList.contains('xyes') && d && c) { d.fee = Math.max(0, d.amount - c.amount); markX(d, c); save(); }
  else { const r = xrej(); r.push(b.dataset.d + '|' + b.dataset.c); localStorage.setItem('xrej', JSON.stringify(r)); }
  render();
});
const MON = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
function parseReceipt(raw) {
  const x = String(raw).replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\u0640]/g, '').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\u064a/g, 'ی').replace(/\u0643/g, 'ک').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  if (!/انتقال\s*(وجه|پایا|ساتنا|پل|کارت)?/.test(x) || !/به\s*نام/.test(x)) return null;
  const a = x.match(/مبلغ\s*([\d,٬]+)/), d = x.match(/(\d{1,2})\s+(\S+)\s+(\d{4})\s*-?\s*(\d{1,2}):(\d{2})/), n = x.match(/به\s*نام\s*(.+?)\s*(با\s*کد|انجام|$)/);
  if (!a || !d || !n) return null;
  const m = MON.indexOf(d[2].replace(/ي/g, 'ی')) + 1; if (!m) return null;
  const p2 = v => String(v).padStart(2, '0');
  return { amount: Number(a[1].replace(/[,٬]/g, '')), date: `${d[3]}/${p2(m)}/${p2(d[1])} ${p2(d[4])}:${d[5]}`, name: n[1].trim() };
}
function receiptArchive() {
  const saved = load('receiptArchive', []);
  return Array.isArray(saved) ? saved.filter(item => item && typeof item.raw === 'string' && item.raw.trim()) : [];
}
function archiveReceipts(items) {
  const saved = receiptArchive(), seen = new Set(saved.map(item => item.raw.trim().slice(0, 1000)));
  let added = false;
  for (const item of items) {
    const raw = String(item.raw || '').trim(), key = raw.slice(0, 1000);
    if (!raw || seen.has(key)) continue;
    seen.add(key); saved.unshift({ raw, at: Number(item.at) || Date.now() }); added = true;
  }
  if (added) { localStorage.setItem('receiptArchive', JSON.stringify(saved)); localStorage.setItem('dirty', '1'); }
  return saved;
}
function receiptArchiveItems() {
  return archiveReceipts([
    ...rcPending().map(raw => ({ raw })),
    ...log.filter(item => item.rc && item.raw).map(item => ({ raw: item.raw, at: item.at })),
    ...tx.filter(item => item.receipt).map(item => ({ raw: item.receipt }))
  ]);
}
function receiptArchiveRender(query) {
  const box = document.getElementById('receipt-archive-results'); if (!box) return;
  const term = nrm(pfa(query || ''));
  const items = receiptArchiveItems().map(item => {
    const match = tx.find(entry => entry.receipt === item.raw.slice(0, 1000));
    const parsed = parseReceipt(item.raw);
    return { ...item, match, parsed };
  }).filter(item => {
    const t = item.match, parsed = item.parsed;
    const fields = [item.raw, parsed && parsed.name, parsed && parsed.date, parsed && String(parsed.amount), parsed && String(Math.round(parsed.amount / 10)), t && t.date, t && t.account, t && accName(t.account), t && t.person, t && t.seller, t && t.desc, t && String(t.amount), t && String(Math.round(t.amount / 10))];
    return !term || fields.some(value => value != null && nrm(pfa(String(value))).includes(term));
  });
  box.innerHTML = items.length ? items.map(item => {
    const t = item.match, rc = item.parsed;
    const name = rc && rc.name || t && (t.person || t.seller) || 'رسید';
    const amount = rc && rc.amount || t && t.amount;
    const date = rc && rc.date || t && t.date || '';
    return `<details style="border-top:1px solid #e5e7eb;padding:10px 0"><summary><b>${esc(name)}</b>${amount ? ' · ' + toman(amount) + ' تومان' : ''}<span class="mut"> · ${t ? 'وصل‌شده به تراکنش' : 'بدون تراکنش متصل'}</span></summary><div class="mut">${esc(date)}${t ? ' · حساب: ' + esc(accName(t.account)) : ''}</div><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(item.raw)}</div></details>`;
  }).join('') : '<div class="mut">رسیدی پیدا نشد.</div>';
}
function receiptArchiveHtml() {
  return `<details class="card"><summary><b>🧾 آرشیو رسیدها</b></summary><div class="mut">رسیدهای موجود و رسیدهای جدید در این دستگاه نگهداری می‌شوند. جست‌وجو با نام، شماره حساب، مبلغ، تاریخ یا متن رسید است.</div><input id="receipt-archive-search" placeholder="جست‌وجوی رسید"><div id="receipt-archive-results"></div></details>`;
}
function rcCands(rc) {
  const dist = t => Math.abs(toMin(t.date) - toMin(rc.date));
  return tx.filter(t => t.type === 'debit' && !t.ghost && !t.xfer && !t.receipt && t.date && t.amount >= rc.amount && t.amount - rc.amount <= 1000000 && dist(t) <= 4320).sort((p, q) => dist(p) - dist(q));
}
function rcAttach(c, rc, raw) {
  const known = [...new Set([...Object.keys(cols()), ...Object.keys(pjobs()), ...tx.filter(t => t.person).map(t => t.person)])];
  const nm = known.find(k => nrm(k) === nrm(rc.name)) || rc.name;
  c.receipt = String(raw).trim().slice(0, 1000);
  if (c.loan) { if (!c.person) c.person = nm; } else if (!c.seller) c.seller = nm;
}
function rcPending() { try { const v = JSON.parse(localStorage.getItem('prc')); return Array.isArray(v) ? v : []; } catch { return []; } }
function rcTryPending() {
  const L = rcPending(); if (!L.length) return 0; let n = 0;
  const rest = L.filter(raw => {
    const rc = parseReceipt(raw); if (!rc) return true;
    if (tx.some(t => t.receipt === String(raw).trim().slice(0, 1000))) return false;
    const cs = rcCands(rc);
    if (cs.length === 1 && cs[0].amount - rc.amount <= 150000 && Math.abs(toMin(cs[0].date) - toMin(rc.date)) <= 30) {
      rcAttach(cs[0], rc, raw); n++; return false;
    }
    return true;
  });
  if (rest.length !== L.length) localStorage.setItem('prc', JSON.stringify(rest));
  if (n) save();
  return n;
}
function rcReviewHtml() {
  return rcPending().map((raw, i) => {
    const rc = parseReceipt(raw); if (!rc) return '';
    const cs = rcCands(rc); if (!cs.length) return '';
    return `<div class="card" style="background:#eefaf6"><b>🧾 انتخاب تراکنش برای رسید</b><div>${toman(rc.amount)} تومان به «${esc(rc.name)}» · ${esc(rc.date)}</div><div class="mut">گزینه درست را انتخاب کن؛ اختلاف مبلغ هم نمایش داده شده است.</div>${cs.map(t => `<div class="row" style="margin-top:8px"><span>${toman(t.amount)} تومان · اختلاف ${toman(t.amount - rc.amount)} تومان<div class="mut">${esc(t.date)} · ${esc(accName(t.account))}</div></span><button class="rcchoose" data-ri="${i}" data-tid="${t.id}">این است</button></div>`).join('')}</div>`;
  }).join('');
}
function rcMessage(t, rc, already) {
  return (already ? 'این رسید قبلاً وصل شده است.' : 'رسید وصل شد ✅') +
    ' گیرنده رسید: ' + rc.name + ' · مبلغ رسید: ' + toman(rc.amount) +
    ' تومان · تراکنش: ' + toman(t.amount) + ' تومان · حساب: ' + accName(t.account) +
    ' · تاریخ: ' + (t.date || 'نامشخص') + (t.desc ? ' · شرح: ' + t.desc : '') +
    ' · برای دیدن متن، «رسید بانکی» را روی تراکنش باز کن.';
}
document.addEventListener('click', e => {
  const b = e.target.closest('.rcchoose'); if (!b) return;
  const L = rcPending(), raw = L[+b.dataset.ri], rc = raw && parseReceipt(raw);
  const t = rc && rcCands(rc).find(x => String(x.id) === b.dataset.tid);
  if (!t) { render(); return; }
  rcAttach(t, rc, raw); L.splice(+b.dataset.ri, 1); localStorage.setItem('prc', JSON.stringify(L)); save(); render();
});
function receiptFlow(raw) {
  const rc = parseReceipt(raw); if (!rc) return false;
  const box = $('#msg'); if (!box) return false;
  raw = String(raw).trim(); const rw = raw.slice(0, 1000);
  archiveReceipts([{ raw }]);
  if (!log.some(l => l.rc && l.raw === rw)) { log.unshift({ at: Date.now(), raw: rw, ok: true, rc: 1, msg: '🧾 رسید بانکی' }); saveLog(); }
  const done = tx.find(t => t.receipt === rw);
  if (done) { box.textContent = rcMessage(done, rc, true); return true; }
  const L = rcPending(); if (!L.some(x => String(x).trim() === raw)) { L.push(raw); localStorage.setItem('prc', JSON.stringify(L)); }
  rcTryPending();
  const attached = tx.find(t => t.receipt === rw);
  if (attached) { box.textContent = rcMessage(attached, rc, false); return true; }
  const cs = rcCands(rc);
  box.textContent = cs.length ? 'رسید ذخیره شد. برای انتخاب و تأیید تراکنش به خانه برو.' : 'رسید ذخیره شد و منتظر پیامک برداشت می‌ماند.';
  return true;
}
function matchTransfers() { return 0; }
// ورود پیامک
function addSms(raw) {
  const r = addSms0(raw);
  log.unshift({ at: Date.now(), raw: String(raw).slice(0, 600), ok: r.ok, msg: r.ok ? 'ثبت شد' : r.msg });
  saveLog();
  return r;
}
function addSms0(raw) {
  const p = parseSms(raw);
  if (!p) return { ok: false, review: true, msg: 'نفهمیدم: قالب پیامک شناخته نشد؛ دستی بررسی کن' };
  if (p.ignored) return { ok: false, msg: 'پیامک رمز بود؛ نادیده گرفته شد' };
  if (p.review) return { ok: false, review: true, msg: 'نفهمیدم: قالب ' + p.bank + ' آزمایشی است و باید دستی بررسی شود' };
  if (p.account && accounts[p.account] === undefined) { accounts[p.account] = /^\d{6,}$/.test(p.account) ? p.bank + ' …' + p.account.slice(-4) : p.bank; }
  const dup = tx.find(t => !t.ghost && t.type === p.type && t.amount === p.amount && t.date === p.date && (!t.account || !p.account || t.account === p.account));
  if (dup) return { ok: false, msg: 'تکراری بود' };
  const t = { id: Date.now() + Math.random(), bank: p.bank, account: p.account, type: p.type, amount: p.amount, balance: p.balance, date: p.date, desc: '', cat: '', pending: true, raw: String(raw).slice(0, 2000) };
  tx.unshift(t); save(); rcTryPending();
  const m = matchTransfers();
  return { ok: true, t, xfer: m };
}

function handleUrl() {
  const rawSearch = location.search;
  const q = new URLSearchParams(location.search);
  const sms = q.get('sms');
  if (location.search) {
    history.replaceState({}, '', location.pathname);
    if (q.get('add') && !sms) {
      tab = 'add';
      setTimeout(() => { const m = $('#ma'); if (m) { m.scrollIntoView(); m.focus(); } }, 400);
    } else if (sms) {
      const r = addSms(sms);
      banner = r.ok ? (r.t.xfer ? '🔁 انتقال بین حساب‌های خودت تشخیص داده شد.' : '✅ پیامک جدید ثبت شد؛ پایین بنویس بابت چی بود.') : '⚠️ ' + r.msg + ' (در تنظیمات ← پیامک‌های دریافتی ببین)';
    } else {
      log.unshift({ at: Date.now(), raw: 'URL: ' + rawSearch.slice(0, 300), ok: false, msg: 'متن پیامک خالی رسید' }); saveLog();
      banner = '⚠️ پیامک خالی رسید. اگر متن را کپی کرده‌ای: <button id="clip">چسباندن از کلیپ‌بورد</button>';
    }
  }
}

function setDesc(id, desc, cat, ex) {
  ex = ex || null;
  if (ex && ex.service) { const L = lsj('svq', []); if (!L.some(x => nrm(x) === nrm(ex.service))) { L.push(ex.service); localStorage.setItem('svq', JSON.stringify(L)); } }
  const t = tx.find(x => x.id === id);
  t.desc = desc; t.cat = cat || t.cat || (t.type === 'debit' ? 'خرید' : 'سایر'); t.pending = false;
  if (ex) {
    if (!ex.preserveBiz) {
      t.customer = ex.customer || ''; t.service = ex.service || '';
      if (ex.ctype !== undefined) { const sale = t.cat === 'فروش'; t.ctype = sale || !t.customer ? '' : ex.ctype; t.cphone = sale ? '' : (ex.cphone || ''); }
    }
    if (ex.remDate) { rem.push({ id: Date.now(), type: 'custom', title: desc || t.customer || 'یادآوری', date: ex.remDate, amount: Math.round(t.amount / 10), alerts: [3, 1], before: 3, count: 0, rep: '' }); saveRem(); }
  }
  save(); render();
}

const drafts = {}, editing = new Set(), editSnapshots = {};
function editSignature(card) {
  return JSON.stringify({ fields: [...card.querySelectorAll('input,select,textarea')].map(x => [x.className, x.value, x.checked]), category: card.dataset.cat || '', customerType: card.querySelector('.ctbox')?.dataset.ct || '', percent: card.querySelector('.pv')?.dataset.v || '' });
}
const JOBS = ['', 'راننده', 'فروشنده', 'تعمیرکار / خدماتی', 'معلم', 'کارمند', 'بازنشسته', 'سایر'];
const job = () => localStorage.getItem('job') || '', work = () => localStorage.getItem('work') || '';
const defaultCustomerType = () => localStorage.getItem('defaultCustomerType') || '';
const salaryJob = () => ['معلم', 'کارمند', 'بازنشسته'].includes(job());
const defIncCat = () => salaryJob() ? 'حقوق' : job() === 'فروشنده' ? 'فروش' : job() ? 'مشتری' : '';
const nrm = s => String(s).replace(/\u064a/g, 'ی').replace(/\u0643/g, 'ک').replace(/[آأإ]/g, 'ا').replace(/[\s\u200c]/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).toLowerCase();
// از دسته‌های ثبت‌شدهٔ قبلی پیشنهاد می‌سازد؛ انتخاب نهایی همچنان با کاربر است.
function categorySuggestion(current, seller, description) {
  const person = nrm(seller || ''), text = nrm(description || '');
  if (!person && !text) return '';
  const counts = new Map();
  tx.forEach(item => {
    if (String(item.id) === String(current.id) || item.type !== 'debit' || item.pending || item.ghost || item.loan || item.xfer || !CATS.includes(item.cat)) return;
    if (person ? nrm(item.seller || '') !== person : nrm(item.desc || '') !== text) return;
    counts.set(item.cat, (counts.get(item.cat) || 0) + 1);
  });
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  return ranked.length && ranked[0][1] >= 2 && (!ranked[1] || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : '';
}
function updateCategorySuggestion(card) {
  const button = card.querySelector('.catsuggestion'), item = tx.find(t => String(t.id) === card.dataset.id);
  if (!button || !item) return;
  const category = categorySuggestion(item, card.querySelector('.p')?.value, card.querySelector('.d')?.value);
  button.hidden = !category; button.dataset.category = category;
  button.textContent = category ? 'پیشنهاد دسته: ' + category : '';
}
function lev(a, b) { const m = []; for (let i = 0; i <= a.length; i++) { m[i] = [i]; } for (let j = 1; j <= b.length; j++) m[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
function nameSugs() {
  const rej = lsj('nameRej', []), out = [];
  ['customer', 'service'].forEach(f => {
    const cnt = {}; tx.forEach(t => { if (t[f]) cnt[t[f]] = (cnt[t[f]] || 0) + 1; });
    const names = Object.keys(cnt);
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j], x = nrm(a), y = nrm(b);
      const near = x === y || (Math.min(x.length, y.length) >= 4 && lev(x, y) <= (Math.max(x.length, y.length) >= 9 ? 2 : 1));
      if (!near) continue;
      const [lo, hi] = cnt[a] > cnt[b] ? [b, a] : [a, b];
      if (!rej.includes(f + '|' + lo + '|' + hi) && !rej.includes(f + '|' + hi + '|' + lo)) out.push({ f, lo, hi });
    }
  });
  return out.slice(0, 3);
}
function nameSugHtml() {
  return nameSugs().map(s => `<div class="card" style="background:#eef4ff" data-nf="${s.f}" data-lo="${esc(s.lo)}" data-hi="${esc(s.hi)}"><b>این‌ها یکی هستند؟</b><div style="margin:6px 0">«${esc(s.lo)}» و «${esc(s.hi)}» <span class="mut">(${s.f === 'customer' ? 'مشتری' : 'خدمت'})</span></div><div class="row"><button class="nmy">بله، یکی کن (${esc(s.hi)})</button><button class="sec nmn">نه، جدا هستند</button></div></div>`).join('');
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-nf]'); if (!c) return;
  const f = c.dataset.nf, lo = c.dataset.lo, hi = c.dataset.hi;
  if (e.target.classList.contains('nmy')) { tx.forEach(t => { if (t[f] === lo) t[f] = hi; }); save(); render(); }
  else if (e.target.classList.contains('nmn')) { const r = lsj('nameRej', []); r.push(f + '|' + lo + '|' + hi); localStorage.setItem('nameRej', JSON.stringify(r)); render(); }
});
document.addEventListener('input', e => { const c = e.target.closest('.card[data-id]'); if (c && e.target.matches('input')) (drafts[c.dataset.id] = drafts[c.dataset.id] || {})[e.target.className.split(' ')[0]] = e.target.value; });
function pendingCard(t) {
  const debit = t.type === 'debit';
  const D = drafts[t.id] || {}, cat0 = D.cat || t.cat || (debit ? '' : defIncCat());
  const showCu = featureOn('invoice') && !debit && (!salaryJob() || t.customer || t.service);
  return `<div class="card" data-id="${t.id}" data-cat="${esc(cat0)}">
    <div><b class="${debit ? 'red' : 'grn'}">${toman(t.amount)} تومان ${debit ? 'کسر شد' : 'واریز شد'}</b></div>
    <div class="mut">${esc(accName(t.account))} · ${esc(t.date)}</div>
    ${t.receipt ? `<details><summary class="mut">🧾 رسید بانکی</summary><div style="font-size:13px;white-space:pre-wrap;margin:6px 0">${esc(t.receipt)}</div><button type="button" class="sec rcpdel" data-id="${t.id}">🗑 حذف رسید</button></details>` : ''}
    ${debit ? `<div>دسته‌بندی</div><select class="catsel"><option value="">انتخاب کن…</option>${CATS.map(c => `<option${c === cat0 ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select><button type="button" class="sec catsuggestion" hidden></button><div>شرح یا توضیحات (اختیاری)</div>` : '<div>از طرف کی / بابت چی؟</div>'}
    <input class="d" list="dl" value="${esc(D.d ?? (t.desc || ''))}" placeholder="${debit ? 'توضیح بیشتر، اگر لازم است' : 'مثلاً: بابت کرایه'}"><datalist id="dl"></datalist>
    <input class="p" list="pl" value="${esc(D.p ?? (t.person || t.seller || ''))}" placeholder="نام شخص / فروشنده"><datalist id="pl">${[...new Set([...Object.keys(cols()), ...people()])].map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <div class="mut bh"></div>
    ${debit ? `<select class="cs"><option value="">انتخاب همکار / شخص…</option>${Object.keys(cols()).map(n => `<option>${esc(n)}</option>`).join('')}</select><select class="lk"><option value="">نوع پرداخت: فقط هزینه</option><option value="wage"${!featureOn('assistant') ? ' hidden' : ''}${t.loan === 'wage' ? ' selected' : ''}>دستمزد / حقوق دستیار</option><option value="lent"${!featureOn('loan') ? ' hidden' : ''}${t.loan === 'lent' ? ' selected' : ''}>قرض دادم</option><option value="payback"${!featureOn('loan') ? ' hidden' : ''}${t.loan === 'payback' ? ' selected' : ''}>قرض پس دادم</option></select>` : ''}
    ${debit ? '' : `<div class="row" ${featureOn('loan') ? '' : 'hidden'}>${[['repaid', 'پس گرفتم'], ['borrowed', 'قرض گرفتم']].map(([k, l]) => `<button class="sec ln" data-k="${k}">${l}</button>`).join('')}</div>`}
    ${showCu ? `<input class="cu" value="${esc(D.cu ?? (t.customer || ''))}" list="customer-list-${t.id}" placeholder="نام مشتری / پرداخت‌کننده (اختیاری)"><datalist id="customer-list-${t.id}">${[...new Set([...tx.map(x => x.customer).filter(Boolean), ...load('ppl', []).filter(x => x.tags && (x.tags.includes('مشتری') || x.tags.includes('راننده'))).map(x => x.name)])].map(n => `<option value="${esc(n)}">`).join('')}</datalist><input class="sv" value="${esc(D.sv ?? (t.service || ''))}" placeholder="بابت چه خدمات/کالایی؟ ${work() ? '(مثلاً: ' + esc(work()) + ')' : '(اختیاری)'}">${svChips()}` : ''}
    ${showCu ? ctBlock(t, D, cat0) : ''}
    ${debit || !featureOn('assistant') ? '' : colBlock(t, D)}
    <div class="chips">${(debit ? [] : INC).map(c => `<button class="chip sec${c === cat0 ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div ${featureOn('reminder') ? '' : 'hidden'}><div class="mut">یادآوری (اختیاری): تاریخ</div><input class="rdt" type="hidden" value="${esc(D.rdt || '')}">${persianDateFields('rdt-' + t.id, D.rdtPersian ?? isoToPersian(D.rdt || ''), 'rdtPersian')}</div>
    <div class="row"><button class="ok">ذخیره</button>${editing.has(String(t.id)) ? '<button class="sec cx">انصراف</button>' : '<button class="sec skip">بعداً</button>'}<button class="sec xf">انتقال خودم</button><button class="sec del">حذف</button></div>
  </div>`;
}

function svChips() {
  const L = lsj('svq', []); return L.length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin:6px 0">${L.map(n => `<button type="button" class="sec sqn" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '';
}
function recentCust() {
  const seen = [], c = {}; tx.forEach(t => { if (t.customer) c[t.customer] = (c[t.customer] || 0) + 1; });
  Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([n]) => seen.push(n));
  return seen.length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin:6px 0">${seen.map(n => `<button type="button" class="sec cqn" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '';
}
function ctBlock(t, D, cat) {
  const ct = D.ct ?? (t.ctype || (!t.pending ? '' : defaultCustomerType()));
  return `<div class="ctbox${cat === 'فروش' ? ' hide' : ''}" data-ct="${ct}"><div class="mut">نوع مشتری (برای فروش کالا لازم نیست)</div><div class="row" style="gap:6px;margin:6px 0"><button type="button" class="sec ctb${ct === 'driver' ? ' on' : ''}" data-v="driver">🚚 راننده</button><button type="button" class="sec ctb${ct === 'normal' ? ' on' : ''}" data-v="normal">🧑 مشتری عادی</button>${lsj('ctypes', []).map(x => `<button type="button" class="sec ctb${ct === x ? ' on' : ''}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div><input class="cph" inputmode="tel" value="${esc(D.ph ?? (t.cphone || ''))}" placeholder="شماره تماس (اختیاری)"></div>`;
}
const lcat = k => k === 'wage' || k === 'share' ? 'کارکرد همکار' : 'قرض';
const LOAN = { wage: ['پرداخت دستمزد', 1], lent: ['قرض دادم', 1], payback: ['بازپرداخت قرضِ خودم', 1], repaid: ['قرضم را پس گرفتم', -1], share: ['کارکرد / سهم همکار', -1], borrowed: ['قرض گرفتم', -1] };
function pjobs() { try { return JSON.parse(localStorage.getItem('pjobs') || '{}'); } catch (e) { return {}; } }
function cols() { try { return JSON.parse(localStorage.getItem('cols') || '{}'); } catch (e) { return {}; } }
function setCols(o) { localStorage.setItem('cols', JSON.stringify(o)); }
function shareOf(amount, pct) { return Math.round(amount * pct / 100); }
function colBlock(t, D) {
  const c = cols(), names = Object.keys(c), sel = D.co ?? (t.colleague || ''), pct = Number(D.pc ?? (t.pct ?? c[sel] ?? 0)) || 0;
  const mode = D.shareMode ?? (t.shareMode || 'percent');
  const fixed = D.shareAmount ?? (t.shareMode === 'fixed' ? Math.round((t.shareAmount || 0) / 10) : '');
  return `<div class="colbox"><b>🤝 دستیار در این کار</b>
    <select class="co"><option value="">بدون دستیار</option>${names.map(n => `<option value="${esc(n)}"${n === sel ? ' selected' : ''}>${esc(n)} (${(c[n] || 0).toLocaleString('fa-IR')}٪)</option>`).join('')}<option value="__new">+ دستیار جدید…</option></select>
    <input class="cn hide" placeholder="نام دستیار جدید">
    <select class="sharemode${sel ? '' : ' hide'}"><option value="percent"${mode === 'percent' ? ' selected' : ''}>سهم درصدی</option><option value="fixed"${mode === 'fixed' ? ' selected' : ''}>مبلغ ثابت (تومان)</option></select>
    <div class="pcrow${sel && mode === 'percent' ? '' : ' hide'}"><span>درصد سهم از کل مبلغ واریزی</span>
      <span class="pcb"><button type="button" class="sec pa" data-d="-1">▼</button><b class="pv" data-v="${pct}">${Number(pct).toLocaleString('fa-IR')}٪</b><button type="button" class="sec pa" data-d="1">▲</button></span></div>
    <input class="sharefixed${sel && mode === 'fixed' ? '' : ' hide'}" type="text" inputmode="numeric" value="${esc(fixed)}" placeholder="مبلغ سهم دستیار (تومان)">
    <div class="mut cs"></div></div>`;
}
function colRefresh(card) {
  const v = card.querySelector('.pv'); if (!v) return;
  const t = tx.find(x => x.id === Number(card.dataset.id)); if (!t) return;
  const p = Number(v.dataset.v), has = card.querySelector('.co').value, mode = card.querySelector('.sharemode').value;
  v.textContent = p.toLocaleString('fa-IR') + '٪';
  card.querySelector('.sharemode').classList.toggle('hide', !has);
  card.querySelector('.pcrow').classList.toggle('hide', !has || mode !== 'percent');
  card.querySelector('.sharefixed').classList.toggle('hide', !has || mode !== 'fixed');
  const sh = mode === 'fixed' ? (invoiceDigits(card.querySelector('.sharefixed').value) || 0) * 10 : shareOf(t.amount, p);
  card.querySelector('.cs').innerHTML = has && sh ? `سهم دستیار: <b>${toman(sh)}</b> تومان · خالصِ من: <b>${toman(t.amount - sh)}</b> تومان` : '';
}
function applyShare(t, name, pct, mode, fixed) {
  const old = tx.find(x => x.parent === t.id && x.loan === 'share');
  tx = tx.filter(x => x.parent !== t.id || x.loan !== 'share');
  t.colleague = ''; t.pct = 0; delete t.shareMode; delete t.shareAmount;
  const sh = mode === 'fixed' ? fixed : shareOf(t.amount, pct);
  if (!name || !sh) return;
  t.colleague = name; t.pct = mode === 'percent' ? pct : 0; t.shareMode = mode; t.shareAmount = sh;
  const details = [t.customer && ((t.ctype === 'driver' ? 'راننده: ' : 'مشتری: ') + t.customer), t.service && ('خدمت: ' + t.service), t.desc && ('توضیح: ' + t.desc)].filter(Boolean).join(' · ');
  const basis = mode === 'fixed' ? 'مبلغ ثابت' : 'سهم ' + pct + '٪';
  tx.push({ id: old ? old.id : Date.now() + Math.random(), parent: t.id, ghost: true, bank: t.bank, account: t.account, type: 'credit', amount: sh, balance: null, date: t.date, cat: 'کارکرد همکار', loan: 'share', person: name, desc: basis + (details ? ' · ' + details : ''), pending: false });
}
function people() { return [...new Set(tx.filter(t => t.person).map(t => t.person))]; }
function monthOf(t) { return t.date.slice(0, 7); }

const isWage = t => t.loan === 'wage' || t.loan === 'share';
const amountOf = L => L.reduce((sum, t) => sum + (LOAN[t.loan]?.[1] || 0) * t.amount, 0);
function balOf(p) { return tx.filter(t => t.loan && t.person === p).reduce((s, t) => s + LOAN[t.loan][1] * t.amount, 0); }
function balHint(card) {
  const h = card.querySelector('.bh'), pi = card.querySelector('.p'); if (!h || !pi) return;
  const p = pi.value.trim(), t = tx.find(x => x.id === Number(card.dataset.id)); h.innerHTML = '';
  if (!p || !t || t.type !== 'debit') return;
  const wage = card.querySelector('.lk')?.value === 'wage';
  const items = tx.filter(x => x.loan && x.person === p && (wage ? isWage(x) : !isWage(x)));
  const b = amountOf(items) - (t.loan && (wage ? isWage(t) : !isWage(t)) ? LOAN[t.loan][1] * t.amount : 0);
  if (b >= 0) { h.innerHTML = b ? `${esc(p)} به تو بدهکار است ${toman(b)} تومان` : ''; return; }
  const left = -b - t.amount;
  h.innerHTML = `بدهی تو به ${esc(p)}: <b>${toman(-b)}</b> · با این پرداخت (${toman(t.amount)}) ${left > 0 ? 'می‌ماند: <b class="red">' + toman(left) + '</b>' : left === 0 ? '<b class="grn">کاملاً تسویه می‌شود ✓</b>' : 'پیش‌پرداخت: <b class="grn">' + toman(-left) + '</b>'} تومان`;
}
document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('p')) balHint(e.target.closest('.card')); });
function dkeys() {
  const seen = {};
  return [...document.querySelectorAll('#app details')].map(d => {
    const c = d.closest('[data-id]'), sm = d.querySelector('summary');
    let k = tab + '|' + (c ? c.dataset.id : '') + '|' + (sm ? sm.textContent.trim().replace(/[\d۰-۹,٬.]+/g, '#').slice(0, 40) : '');
    seen[k] = (seen[k] || 0) + 1; return [d, k + '|' + seen[k]];
  });
}
function render() {
  const y = window.scrollY, was = new Set(dkeys().filter(([d]) => d.open).map(x => x[1])), t0 = tab;
  _render2();
  if (tab === t0) { dkeys().forEach(([d, k]) => { if (was.has(k)) d.open = true; }); window.scrollTo(0, y); }
}
function _render2() { _render(); document.querySelectorAll('.card[data-id]').forEach(c => { colRefresh(c); balHint(c); updateCategorySuggestion(c); }); if (tab === 'add' && topic === 'expenses') { const sms = document.getElementById('sms')?.closest('.card'); if (sms) sms.hidden = !featureOn('sms'); } document.querySelectorAll('[data-feature-section]').forEach(el => { el.hidden = !featureOn(el.dataset.featureSection); }); }
function _render() {
  const topicFeature = { invoices: 'invoice', sales: 'invoice', work: 'assistant', reminders: 'reminder', receipts: 'sms' };
  if (topicFeature[topic] && !featureOn(topicFeature[topic])) topic = 'expenses';
  document.querySelectorAll('[data-topic]').forEach(b => { b.hidden = !!topicFeature[b.dataset.topic] && !featureOn(topicFeature[b.dataset.topic]); });
  const contactsNav = document.querySelector('nav [data-t="contacts"]'); if (contactsNav) contactsNav.hidden = false;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  document.querySelectorAll('[data-topic]').forEach(b => b.classList.toggle('on', b.dataset.topic === topic));
  const el = $('#app');
  if (!SYNC() && !localStorage.getItem('noSync')) { el.innerHTML = setupHtml(); return; }
  if (tab === 'rem') { topic = 'reminders'; tab = 'home'; }
  if (tab !== 'contacts' && tab !== 'settings' && topic !== 'expenses') {
    if ((topic === 'invoices' || topic === 'sales') && tab !== 'add') {
      const salesOnly = topic === 'sales', list = invoiceList().filter(item => !salesOnly || item.kind === 'فروش'), confirmed = list.filter(item => item.accounting?.status === 'confirmed'), unpaid = list.filter(item => item.payment?.method === 'unpaid');
      el.innerHTML = tab === 'report' ? invoiceLedgerHtml(list) + invoiceHtml() : `<div class="topic-summary"><div>${salesOnly ? 'فروش کالا' : 'فاکتورها'}</div><b>${list.length.toLocaleString('fa-IR')} فاکتور</b><div>${confirmed.length.toLocaleString('fa-IR')} تأییدشده · ${unpaid.length.toLocaleString('fa-IR')} نسیه</div></div>${!salesOnly ? `<div class="card invoice-categories"><b>دسته‌های فاکتور</b><div class="invoice-category-grid"><button type="button" class="sec invoice-open-list" data-filter="service">🔧 خدمات (${list.filter(item => (item.kind || 'خدمات') === 'خدمات').length.toLocaleString('fa-IR')})</button><button type="button" class="sec invoice-open-list" data-filter="sale">🛒 فروش (${list.filter(item => item.kind === 'فروش').length.toLocaleString('fa-IR')})</button><button type="button" class="sec invoice-open-list" data-filter="unpaid">📌 نسیه (${unpaid.length.toLocaleString('fa-IR')})</button></div><div class="mut">نسیه وضعیت پرداخت است و می‌تواند مربوط به خدمات یا فروش باشد.</div></div>` : ''}<div class="card"><b>آخرین ${salesOnly ? 'فروش‌ها' : 'فاکتورها'}</b>${list.slice(0, 10).map(item => `<div class="invoice-result"><b>${esc(item.customer || 'بدون نام')} · ${esc(item.number || '')}</b><div class="mut">${esc(item.date || '')} · ${Number(item.total || 0).toLocaleString('fa-IR')} تومان · ${item.accounting?.status === 'confirmed' ? 'تأییدشده' : 'در انتظار تأیید'}</div></div>`).join('') || '<div class="mut">هنوز موردی ثبت نشده است.</div>'}<button class="invoice-open-list" type="button">جست‌وجو و گزارش ${salesOnly ? 'فروش‌ها' : 'فاکتورها'}</button></div>`;
      if (tab === 'report') {
        invoiceBind(); document.getElementById('invoice-card').open = true;
        document.getElementById('invoice-form-fields').hidden = true;
        document.getElementById('invoice-search-panel').open = true;
        document.querySelector('#invoice-card > summary b').textContent = salesOnly ? '🔎 جست‌وجوی فروش‌ها' : '🔎 جست‌وجوی فاکتورها';
      }
      return;
    }
    if (topic === 'receipts') {
      el.innerHTML = `${tab === 'add' ? '<div class="card"><b>ثبت رسید بانکی</b><textarea id="sms" rows="5" placeholder="متن پیامک رسید را اینجا بچسبان"></textarea><div class="topic-actions"><button id="go">ثبت رسید</button><button id="pst" class="sec">چسباندن</button></div><div id="msg" class="mut"></div></div>' : ''}${receiptArchiveHtml()}${tab === 'home' ? rcReviewHtml() : ''}`;
      receiptArchiveRender(''); $('#receipt-archive-search').oninput = e => receiptArchiveRender(e.target.value);
      if (tab === 'add') {
        $('#pst').onclick = async () => { try { $('#sms').value = await navigator.clipboard.readText(); } catch (_) { $('#msg').textContent = 'متن رسید را داخل کادر بچسبان.'; } };
        $('#go').onclick = () => { if (receiptFlow($('#sms').value)) { $('#sms').value = ''; receiptArchiveRender(''); } else $('#msg').textContent = 'رسید شناخته نشد؛ متن پیامک رسید را بررسی کن.'; };
      }
      return;
    }
    if (topic === 'work') {
      const relevant = tx.filter(item => item.loan && LOAN[item.loan] && isWage(item));
      const title = 'حساب دستیاران و کارکردها';
      const summary = tab === 'report' ? `<div class="topic-summary"><div>گزارش ${title}</div><b>${relevant.length.toLocaleString('fa-IR')} ردیف</b><div>جزئیات و مانده هر شخص جداگانه در حساب او نمایش داده می‌شود.</div></div>` : '';
      el.innerHTML = summary + `<div class="topic-heading">${title} · برای ثبت یا مشاهده جزئیات، حساب شخص را باز کن.</div>` + loansHtml();
      return;
    }
    if (topic === 'reminders') {
      el.innerHTML = remHtml(); accordion(el, 'rem'); remBind();
      const form = $('#rt').closest('.card');
      if (tab === 'add') { [...el.children].forEach(child => { if (child !== form) child.hidden = true; }); form.open = true; }
      else form.hidden = true;
      return;
    }
  }
  if (tab === 'home' || tab === 'report') {
    el.innerHTML = tab === 'home' ? homeHtml() : reportHtml().replace(invoiceLedgerHtml(), '');
    $('#m') && ($('#m').onchange = e => { month = e.target.value; render(); });
  } else if (tab === 'rem') {
    el.innerHTML = receiptArchiveHtml() + remHtml(); accordion(el, 'rem'); remBind(); receiptArchiveRender(''); $('#receipt-archive-search').oninput = e => receiptArchiveRender(e.target.value);
  } else if (tab === 'contacts') {
    el.innerHTML = contactsHtml();
  } else if (tab === 'loans') {
    el.innerHTML = loansHtml();
  } else if (tab === 'add') {
    el.innerHTML = `${invoiceHtml()}
      <div class="card"><b>ثبت پیامک دستی <small>(کپی و پیست پیامک)</small></b>
        <textarea id="sms" rows="5" placeholder="متن پیامک بانکی را اینجا Paste کنید"></textarea>
        <div class="row"><button id="go">ثبت پیامک دستی <small>(کپی و پیست پیامک)</small></button><button id="pst" class="sec">📋 چسباندن</button></div><div id="msg" class="mut"></div><button type="button" id="manual-open-159" style="background:#2563eb">ثبت تراکنش دستی</button></div>
      <div class="card" id="manual-entry-159"><b>ثبت دستی (مثلاً بلو)</b>
        <input id="ma" type="text" inputmode="numeric" placeholder="مبلغ به تومان">
        <input id="md" placeholder="بابت چی؟">
        <select id="mc">${CATS.map(c => `<option>${c}</option>`).join('')}</select>
        <select id="mt"><option value="debit">هزینه</option><option value="credit">واریز</option><option value="xfer">انتقال بین حساب‌های خودم</option>${Object.entries(LOAN).map(([k, v]) => `<option value="loan:${k}"${((k === 'wage' || k === 'share') ? !featureOn('assistant') : !featureOn('loan')) ? ' hidden' : ''}>${v[0]}</option>`).join('')}</select>
        <input id="mp" list="pl2" placeholder="نام شخص (برای قرض)"><datalist id="pl2">${people().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        <div id="xs" class="hide"><div class="mut">از حساب:</div><select id="xf">${allAccs().map(a => `<option value="${esc(a)}">${esc(accName(a))}</option>`).join('')}</select><div class="mut">به حساب:</div><select id="xt">${allAccs().map(a => `<option value="${esc(a)}">${esc(accName(a))}</option>`).join('')}</select></div>
        <input id="mac" placeholder="نام حساب" value="بلو">
        <button id="mg">ثبت</button></div>`;
    accordion(el, 'add');
    invoiceBind();
    if (topic === 'invoices' || topic === 'sales') { [...el.children].forEach(child => { if (child.id !== 'invoice-card') child.hidden = true; }); document.getElementById('invoice-card').open = true; if (topic === 'sales') { document.getElementById('inv-kind').value = 'فروش'; document.getElementById('inv-owner-fields').hidden = true; } }
    else document.getElementById('invoice-card').hidden = true;
    $('#manual-open-159').onclick = () => { const card = document.getElementById('manual-entry-159'); if (!card) return; card.open = true; card.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('ma')?.focus({ preventScroll: true }); };
    $('#pst').onclick = async () => { try { const t = await navigator.clipboard.readText(); if (!t) { $('#msg').textContent = 'کلیپ‌بورد خالی است'; return; } $('#sms').value = t; $('#msg').textContent = 'چسبانده شد'; } catch (e) { $('#sms').focus(); $('#msg').textContent = 'اجازهٔ دسترسی به کلیپ‌بورد داده نشد؛ داخل کادر نگه دار و «Paste» بزن.'; } };
    $('#go').onclick = () => { if (receiptFlow($('#sms').value)) { $('#sms').value = ''; return; } const r = addSms($('#sms').value); $('#msg').textContent = r.ok ? 'اضافه شد ✅' : r.msg; if (r.ok) { $('#sms').value = ''; } };
    $('#mt').onchange = () => $('#xs').classList.toggle('hide', $('#mt').value !== 'xfer');
    $('#mg').onclick = () => {
      const a = invoiceDigits($('#ma').value); if (!a || !Number.isSafeInteger(a * 10)) { alert('مبلغ معتبر به تومان وارد کن'); return; }
      const mv = $('#mt').value, lk = mv.startsWith('loan:') ? mv.slice(5) : '';
      if (lk && !$('#mp').value.trim()) { alert('نام شخص را بنویس'); return; }
      if ($('#mt').value === 'xfer') {
        const f = $('#xf').value, to = $('#xt').value; if (f === to) { alert('مبدأ و مقصد یکی است'); return; }
        const d = nowStr(), base = { bank: '', balance: null, date: d, pending: false, amount: a * 10 };
        const D = { ...base, id: Date.now(), account: f, type: 'debit' }, C = { ...base, id: Date.now() + 1, account: to, type: 'credit' };
        markX(D, C); tx.unshift(D, C); save(); tab = 'home'; render(); return;
      }
      const n = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = t => n.find(x => x.type === t).value;
      const acc = $('#mac').value || 'دستی';
      if (!Object.values(accounts).includes(acc)) accounts['manual:' + acc] = acc;
      const key = Object.keys(accounts).find(k => accounts[k] === acc);
      tx.unshift({ id: Date.now(), bank: acc, account: key, type: lk ? (LOAN[lk][1] > 0 ? 'debit' : 'credit') : mv, amount: a * 10, balance: null, date: `${g('year')}/${g('month')}/${g('day')} ${g('hour')}:${g('minute')}`, desc: $('#md').value, cat: lk ? lcat(lk) : $('#mc').value, pending: false, ...(lk ? { loan: lk, person: $('#mp').value.trim() } : {}) });
      save(); tab = 'home'; render();
    };
  } else {
    el.innerHTML = `
      ${undo.length ? `<div class="card" style="border:2px solid #f59e0b"><b>↩️ آخرین تغییر: ${esc(undo[undo.length - 1].label)}</b><div class="mut">تا وقتی برنامه را نبسته‌ای می‌شود برگرداند. بعد از بستن برنامه قطعی می‌شود.</div><button id="undo">برگرداندن (Undo)</button></div>` : ''}<div class="card"><b>نام حساب‌ها</b>
        ${Object.entries(accounts).map(([k, v]) => `<div class="mut" style="margin-top:8px">${esc(k)} · ${tx.filter(t => t.account === k).length} تراکنش</div><input data-k="${esc(k)}" class="an" value="${esc(v)}"><div class="row" style="margin-top:6px"><select class="mvs" data-k="${esc(k)}"><option value="">انتقال به…</option>${Object.entries(accounts).filter(([k2]) => k2 !== k).map(([k2, v2]) => `<option value="${esc(k2)}">${esc(v2)}</option>`).join('')}</select><button class="sec edk" data-k="${esc(k)}">ویرایش شماره</button><button class="sec mvb" data-k="${esc(k)}">ادغام</button><button class="sec dlb" data-k="${esc(k)}">حذف</button></div>`).join('')}
        <button id="sa">ذخیره نام‌ها</button>
        <div class="mut" style="margin-top:14px">افزودن حساب جدید (شمارهٔ حساب همان که در پیامک می‌آید)</div>
        <select id="nb"><option value="">بانک را انتخاب کن</option><option value="مهر ایران">مهر ایران (شماره در پیامک)</option><option value="ملی">ملی (شماره حساب کوتاه)</option><option value="بلو">بلو (بدون شماره)</option><option value="سامان">سامان</option><option value="other">دیگر</option></select>
        <input id="nk" placeholder="شمارهٔ حساب"><input id="nn" placeholder="نام (مثلاً: ملت، مرجع)"><div class="mut">حساب‌های جدید از اولین پیامک خودکار ساخته می‌شوند؛ این فرم فقط برای نام‌گذاری زودتر است.</div><button class="sec" id="na">افزودن حساب</button></div>
      <div class="card"><b>پشتیبان‌گیری</b>
        <div class="mut">فایل پشتیبان کامل شامل اطلاعات شخصی و نشانی اتصال است؛ آن را در جای امن نگه دار.</div>
        <div class="row" style="margin-top:8px"><button id="full-backup">دانلود پشتیبان کامل</button><button class="sec" id="full-restore">بازیابی پشتیبان کامل</button><input type="file" id="full-restore-file" accept=".json,application/json" class="hide"></div><button type="button" class="sec" id="category-download">دانلود پشتیبان پیش از ادغام</button><button type="button" class="sec" id="category-restore">بازگردانی دسته‌ها به قبل از ادغام</button><div class="mut" id="full-backup-msg" aria-live="polite"></div>
        <div class="row" style="margin-top:8px"><button id="ex">خروجی (کپی)</button><button id="bf">وارد کردن فایل بانک</button> <input type="file" id="bfi" accept=".xlsx" class="hide"> <button id="mgx" class="sec">ادغام (بدون حذف)</button> <button class="sec" id="im">بازیابی</button></div>
        <textarea id="bk" rows="4" placeholder="برای بازیابی، متن پشتیبان را اینجا بچسبانید"></textarea></div>`;
    el.insertAdjacentHTML('afterbegin', `<div class="card" id="legacy-sync-settings"><b>همگام‌سازی با Google Sheets</b>
      <div class="mut">${esc(localStorage.getItem('legacySyncPaused') === '1' ? 'اتصال قدیمی روی این دستگاه متوقف است؛ نشانی قبلی نگهداری شده است.' : syncMsg || (SYNC() ? '' : 'آدرس وصل نشده'))}</div>
      ${localStorage.getItem('legacySyncPaused') === '1' ? '<div class="mut">اتصال قبلی متوقف می‌ماند؛ این دکمه فقط یک بار با آدرس اصلی جدید همگام‌سازی می‌کند.</div><button type="button" id="easy-main-sync">همگام‌سازی الان</button><div class="mut" id="easy-main-sync-status" aria-live="polite"></div>' : localStorage.getItem('syncLock') && SYNC() ? `<div class="mut">🔒 آدرس شیت یک بار وصل شد و قفل است (…${esc(SYNC().slice(-12))})</div><div class="row"><button id="sy">همگام‌سازی الان</button> <button class="sec" id="gs">باز کردن Google Sheet</button> <button class="sec" id="ul">تغییر آدرس</button></div>` : `<input id="su" placeholder="آدرس Web App (…/exec)" value="${esc(SYNC())}"><button id="sy">ذخیره و همگام‌سازی</button> <button class="sec" id="gs">باز کردن Google Sheet</button>`}<button type="button" class="sec" id="easy-main-use">استفاده از آدرس اصلی جدید</button></div>`);
    el.insertAdjacentHTML('beforeend', `<div class="card" id="google-test"><b>آزمایش ورود به گوگل</b><div class="mut">ورود به گوگل را آزمایش کن یا یک شیت آزمایشی خالی بساز. اطلاعات مالی به آن منتقل نمی‌شود و همگام‌سازی فعلی تغییر نمی‌کند.</div><button id="google-test-btn" disabled>در حال آماده‌سازی…</button><div class="mut" id="google-test-msg" aria-live="polite">${esc(googleTestMessage)}</div><button class="sec" id="google-sheet-test-btn" disabled style="margin-top:8px">در حال آماده‌سازی…</button><div class="mut" id="google-sheet-test-msg" aria-live="polite">${esc(googleSheetMessage)}</div><button class="sec" id="google-write-test-btn" disabled style="margin-top:8px">در حال آماده‌سازی…</button><div class="mut" id="google-write-test-msg" aria-live="polite">${esc(googleWriteMessage)}</div><button class="sec" id="google-data-test-btn" disabled style="margin-top:8px">در حال آماده‌سازی…</button><div class="mut" id="google-data-test-msg" aria-live="polite">${esc(googleDataMessage)}</div><div class="google-sheet-link">${googleSheetLink()}</div></div>`);
    prepareGoogleTest();
    el.insertAdjacentHTML('beforeend', `<div class="card" id="google-copy"><b>نسخه پشتیبان در گوگل</b><div class="mut">نسخه‌ای جدا از اطلاعات این دستگاه در شیت جدید ساخته می‌شود؛ همگام‌سازی خودکار فعال نیست.</div><button id="google-copy-btn" disabled>در حال آماده‌سازی…</button><div class="mut" id="google-copy-msg" aria-live="polite">${esc(googleCopyMessage)}</div><div id="google-copy-link">${googleCopyLink()}</div><hr><b>بازیابی نسخه گوگل</b><div class="mut">لینک شیت پشتیبان را وارد کن یا خالی بگذار تا آخرین شیت ساخته‌شده در این دستگاه بررسی شود. فایل بررسی‌شده دانلود می‌شود؛ سپس از بخش «پشتیبان‌گیری» آن را بازیابی کن.</div><input id="google-restore-url" type="url" placeholder="لینک شیت پشتیبان (اختیاری)" dir="ltr"><button id="google-restore-btn" disabled>در حال آماده‌سازی…</button><div id="google-restore-msg" class="mut" aria-live="polite"></div></div>`);
    prepareGoogleCopy();
    el.insertAdjacentHTML('beforeend', `<div class="card" id="easy-setup"><b>ساخت اتصال آسان گوگل (آزمایشی)</b><div class="mut">یک شیت خالی و اسکریپت جدا فقط برای آزمایش ساخته می‌شود. هیچ اطلاعات مالی منتقل نمی‌شود و اتصال‌های قبلی تغییر نمی‌کنند. شاید گوگل اجازه‌های جداگانه بخواهد.</div><div id="easy-step-api" class="mut"></div><p><a href="https://script.google.com/home/usersettings" target="_blank" rel="noopener noreferrer">باز کردن تنظیمات دسترسی Apps Script</a></p><button type="button" id="easy-wizard-api">روشن کردم، ادامه</button><div id="easy-step-email" class="mut"></div><button type="button" id="easy-wizard-email-select" class="sec">انتخاب ایمیل</button><div id="easy-step-build" class="mut"></div><button type="button" id="easy-setup-start">ساخت اتصال آسان گوگل</button><div id="easy-step-auth" class="mut"></div><div id="easy-step-result" class="mut"></div><details><summary>پیشرفته</summary><button type="button" id="easy-setup-reset" class="sec">پاک‌کردن وضعیت آزمایش</button></details><div id="easy-admin" hidden></div><div class="mut" id="easy-setup-status" aria-live="polite"></div><div id="easy-setup-links"></div><dialog id="easy-auth-dialog" dir="rtl" style="max-width:90%;border:0;border-radius:16px;padding:20px"><b>با کدام حساب گوگل وارد می‌شوی؟</b><div class="mut">همان ایمیلی را بزن که اسکریپت با آن ساخته شد. برنامه حساب‌های باز Safari را نمی‌بیند؛ اگر گوگل دوباره پرسید، همان ایمیل را انتخاب کن.</div><label for="easy-auth-email">ایمیل گوگل</label><input id="easy-auth-email" type="email" dir="ltr" autocomplete="email"><button type="button" id="easy-auth-continue">ادامه</button> <button type="button" class="sec" id="easy-auth-cancel">انصراف</button><div id="easy-auth-error" class="mut" aria-live="polite"></div><a id="easy-auth-fallback" href="#" target="_self" rel="noopener noreferrer" hidden>باز کردن در همین صفحه</a></dialog><div id="easy-authorize" hidden><hr><b>یک بار اجازه بده</b><div class="mut">با حساب سازنده اسکریپت وارد شو. در صفحه گوگل Review permissions را بزن. اگر هشدار نمایش داده شد، Advanced و Go to را بررسی کن؛ سپس اگر به برنامه اعتماد داری Allow را بزن. سپس برگرد و بررسی کن.</div><button type="button" id="easy-authorize-open">باز کردن صفحهٔ مجوز گوگل</button><button type="button" class="sec" id="easy-authorize-check">اجازه دادم، بررسی کن</button><div id="easy-authorize-status" class="mut" aria-live="polite"></div></div></div>`);
    easySetupPrepare();
    el.insertAdjacentHTML('beforeend', `<div class="card" id="direct-sync"><b>اتصال مستقیم آزمایشی به شیت</b><div class="mut">ذخیره و دریافت دستی در شیتی جدا انجام می‌شود. نسخه‌های قبلی حفظ می‌شوند و تعارض دستگاه‌ها اعلام می‌شود. ادغام همه تعارض‌ها هنوز فعال نیست.</div><input id="direct-sync-url" type="url" dir="ltr" placeholder="لینک شیت اتصال مستقیم (برای دستگاه دیگر)"><div class="row"><button id="direct-sync-create" disabled>ساخت شیت جدا</button><button id="direct-sync-run" disabled>بررسی و همگام‌سازی دستی</button></div><button id="direct-sync-receive" disabled>دریافت مستقیم نسخه جدید</button><div class="mut">دریافت فقط وقتی مجاز است که اطلاعات دستگاه تغییر ارسال‌نشده نداشته باشد و اتصال قدیمی Apps Script غیرفعال باشد. نسخه قبلی در دستگاه نگهداری می‌شود.</div><div class="row"><button type="button" class="sec" id="direct-receive-previous">دانلود پشتیبان قبل از دریافت</button><button type="button" class="sec" id="direct-receive-clear">حذف پشتیبان محلی قبلی</button></div><button id="direct-sync-receipts" disabled>ارسال آرشیو رسیدها به شیت</button><div class="mut">رسیدها در برگه‌ای جدا و به‌صورت دستی اضافه می‌شوند؛ ابتدا همگام‌سازی دستی را انجام بده. وضعیت و حساب هر رسید مربوط به زمان ارسال است.</div><div class="mut" id="direct-sync-message" aria-live="polite"></div><div id="direct-sync-link"></div><hr><b>ارسال خودکار در این نشست</b><div class="mut">با اجازه تو، تا وقتی برنامه باز و دسترسی گوگل معتبر است، تغییرات این دستگاه به شیت افزوده می‌شود. دریافت خودکار اختیاری است؛ برای دریافت، فرم‌های باز را ببند و به صفحه خانه برو. پس از قطع موقت، نتیجه ارسال حتی بعد از بازشدن مجدد برنامه هم با فعال‌کردن اتصال بررسی می‌شود؛ تعارض یا پایان اعتبار دسترسی اتصال را متوقف می‌کند.</div><div class="row"><button type="button" id="direct-auto-start" disabled>فعال‌کردن ارسال خودکار</button><button type="button" id="direct-auto-stop" class="sec" disabled>توقف</button></div><div id="direct-auto-status" class="mut" aria-live="polite"></div></div>`);
    directSyncPrepare();
    legacyInboxPrepare(el);
    if (SYNC()) {
      const legacyButton = document.createElement('button'); legacyButton.type = 'button'; legacyButton.className = 'sec'; legacyButton.textContent = 'توقف اتصال قدیمی در این گوشی';
      legacyButton.onclick = () => {
        if (!confirm('اتصال قدیمی فقط در این گوشی متوقف شود؟ نشانی و اطلاعات باقی می‌مانند. ابتدا سایر پنجره‌ها و نسخه‌های باز برنامه را ببند؛ سپس برنامه دوباره باز می‌شود.')) return;
        try { pauseLegacySync(); location.reload(); } catch (error) { directSyncMessage('⚠️ ' + (error.message || error)); }
      };
      document.getElementById('direct-sync-message').insertAdjacentElement('beforebegin', legacyButton);
    }
    el.insertAdjacentHTML('beforeend', `    <div class="card" id="jbc"><b>شغل من</b><div class="mut">برنامه بر اساس شغل، برچسب و کادرهای پیش‌فرض را تنظیم می‌کند. (معلم، کارمند، بازنشسته: پیش‌فرض «حقوق»، بدون پرسش مشتری. فروشنده: «فروش». راننده و خدماتی: «مشتری» و «خدمت».) فقط روی همین دستگاه ذخیره می‌شود.</div><select id="jobs">${JOBS.map(j => `<option value="${esc(j)}" ${j === job() ? 'selected' : ''}>${j || 'انتخاب کن'}</option>`).join('')}</select><input id="wk" placeholder="کار اصلی؟ مثلاً: فروش زغال، تعمیر تاکوگراف" value="${esc(work())}"><div class="mut">مشتری‌های اصلی من چه کسانی هستند؟</div><select id="defaultct"><option value="">انتخاب در هر تراکنش</option><option value="driver"${defaultCustomerType() === 'driver' ? ' selected' : ''}>راننده</option><option value="normal"${defaultCustomerType() === 'normal' ? ' selected' : ''}>مشتری عادی</option>${lsj('ctypes', []).map(x => `<option value="${esc(x)}"${defaultCustomerType() === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`);
    $('#jobs').onchange = e => { localStorage.setItem('job', e.target.value); localStorage.setItem('dirty', '1'); push(); };
    $('#defaultct').onchange = e => { localStorage.setItem('defaultCustomerType', e.target.value); localStorage.setItem('dirty', '1'); push(); };
    $('#wk').onchange = e => { localStorage.setItem('work', e.target.value.trim()); localStorage.setItem('dirty', '1'); push(); };
    $('#jbc').insertAdjacentHTML('beforeend', `<label style="display:block;margin-top:12px"><input id="biz-toggle" type="checkbox" style="width:auto;vertical-align:middle" ${featureOn('invoice') && featureOn('assistant') ? 'checked' : ''}> حالت کسب‌وکار</label><div class="mut">با خاموش‌کردن، بخش‌های کسب‌وکار پنهان می‌شوند و اطلاعاتشان باقی می‌ماند.</div>`);
    $('#biz-toggle').onchange = e => { const current = load('features', {}), next = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}; next.invoice = e.target.checked; next.assistant = e.target.checked; localStorage.setItem('features', JSON.stringify(next)); localStorage.setItem('bizMode', e.target.checked ? '1' : '0'); localStorage.setItem('dirty', '1'); render(); };
    el.insertAdjacentHTML('beforeend', `<div class="card" id="features-settings"><b>چه بخش‌هایی را می‌خواهم؟</b><div class="mut">با برداشتن تیک، بخش فقط پنهان می‌شود و اطلاعاتش باقی می‌ماند.</div><div id="features-fields">${Object.entries(FEATURE_LABELS).map(([key, label]) => `<label style="display:block;margin:9px 0"><input type="checkbox" class="feature-toggle" data-feature-name="${key}" style="width:auto" ${featureOn(key) ? 'checked' : ''}> ${label}</label>`).join('')}</div></div>`);
    $('#features-fields').onchange = e => { if (!e.target.classList.contains('feature-toggle')) return; const current = load('features', {}); const next = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}; next[e.target.dataset.featureName] = e.target.checked; localStorage.setItem('features', JSON.stringify(next)); localStorage.setItem('dirty', '1'); render(); };
    const budgetData = load('budgets', {}), budgets = budgetData && typeof budgetData === 'object' && !Array.isArray(budgetData) ? budgetData : {};
    const budgetMonth = jd(new Date()).slice(0, 7), rows = budgetRows157(CATS, budgets, tx, budgetMonth);
    el.insertAdjacentHTML('beforeend', `<div class="card" id="budget-settings"><b>بودجهٔ ماهانه</b><div class="mut">سقف هر دسته به تومان؛ کادر خالی یعنی بدون سقف. این تنظیم در پشتیبان کامل و نسخهٔ اتصال مستقیم نگهداری می‌شود.</div><div id="budget-fields">${CATS.map(c => { const row = rows.find(r => r.category === c), color = row?.color === 'red' ? '#dc2626' : row?.color === 'yellow' ? '#d69e00' : '#0f766e'; return `<div style="margin-top:12px"><label>${esc(c)} <input class="budget-input" data-category="${esc(c)}" type="text" inputmode="numeric" value="${Number.isSafeInteger(budgets[c]) && budgets[c] > 0 ? budgets[c] : ''}" placeholder="بدون سقف"></label>${row ? `<div class="mut">خرج این ماه: ${Math.round(row.spent).toLocaleString('fa-IR')} از ${row.limit.toLocaleString('fa-IR')} تومان</div><div style="height:7px;background:#e5e7eb;border-radius:8px"><div style="height:100%;width:${Math.min(100, Math.max(0, row.ratio * 100))}%;background:${color};border-radius:8px"></div></div>` : ''}</div>`; }).join('')}</div><div class="mut" id="budget-status"></div></div>`);
    $('#budget-fields').onchange = e => {
      if (!e.target.classList.contains('budget-input')) return;
      const text = e.target.value.trim(), value = text ? invoiceDigits(text) : 0;
      if (value === null || !Number.isSafeInteger(value) || value < 0) { $('#budget-status').textContent = 'مبلغ معتبر به تومان وارد کن.'; return; }
      const current = load('budgets', {}), next = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {};
      if (value) next[e.target.dataset.category] = value; else delete next[e.target.dataset.category];
      localStorage.setItem('budgets', JSON.stringify(next)); render();
    };
    const LDEF = { cats: [...DEFAULT_CATS], icats: ['فروش', 'مشتری', 'حقوق', 'سایر'], ctypes: [], svq: [], carModels: ['اسکانیا', 'ولوو'], carColors: [], carTypes: [] };
    const labList = k => k === 'cats' ? CATS : k === 'icats' ? INC : k === 'carModels' ? carModels() : lsj(k, []);
    const labHtml = () => [['cats', 'برچسب‌های هزینه'], ['icats', 'برچسب‌های درآمد'], ['ctypes', 'نوع مشتری (علاوه بر راننده و مشتری عادی)'], ['svq', 'عبارت‌های سریع «بابت چه خدمات/کالایی»'], ['carModels', 'مدل خودروهای رانندگان'], ['carColors', 'رنگ خودرو'], ['carTypes', 'نوع خودرو']].map(([k, n]) => `<div style="margin-top:14px;font-weight:700">${n}</div><div class="chips" style="margin-top:6px">${labList(k).map((c, i) => `<span class="chip sec" style="display:inline-flex;align-items:center;gap:8px">${esc(c)}${['svq', 'carModels', 'carColors', 'carTypes'].includes(k) ? `<button type="button" class="sec lbedit" data-k="${k}" data-i="${i}">ویرایش</button>` : ''}<b class="lbd" data-k="${k}" data-i="${i}" style="color:#dc2626;cursor:pointer;padding:0 4px;font-size:18px" role="button">×</b></span>`).join('') || '<span class="mut">خالی است</span>'}</div><div class="row" style="margin-top:8px"><input class="lbn" data-k="${k}" placeholder="برچسب جدید"><button class="lba" data-k="${k}">افزودن</button></div><div class="mut lbstatus" data-k="${k}" aria-live="polite"></div><div style="margin-top:4px"><a class="lbr mut" data-k="${k}" style="cursor:pointer;font-size:12px;text-decoration:underline">برگرداندن به حالت اولیه</a></div>`).join('');
    el.insertAdjacentHTML('beforeend', `<div class="card" id="lbc"><b>برچسب‌ها</b><div class="mut">با زدن × برچسب حذف می‌شود، با نوشتن نام و «افزودن» (یا Enter) اضافه می‌شود. همه‌جا همین‌ها دیده می‌شوند و بین دستگاه‌ها همگام می‌شوند.</div><div class="mut" id="lbm" style="color:#0f766e;min-height:18px"></div><div id="lbx">${labHtml()}</div></div>`);
    const lbMsg = (k, m) => { const el = $('#lbx .lbstatus[data-k="' + k + '"]'); if (el) el.textContent = m; };
    const lbSet = (k, L, m) => { if (k === 'cats') { CATS.length = 0; CATS.push(...L); } else if (k === 'icats') { INC.length = 0; INC.push(...L); } localStorage.setItem(k, JSON.stringify(L)); localStorage.setItem('dirty', '1'); $('#lbx').innerHTML = labHtml(); lbMsg(k, m); push(); };
    const lbAdd = k => { const inp = $('#lbc .lbn[data-k="' + k + '"]'), v = inp.value.trim(), L = labList(k).slice(); if (!v) { lbMsg(k, 'ابتدا نام را بنویس'); return; } if (L.some(x => nrm(x) === nrm(v))) { lbMsg(k, '«' + v + '» از قبل هست'); return; } L.push(v); lbSet(k, L, '✅ «' + v + '» اضافه شد'); };
    $('#lbx').onclick = e => {
      const b = e.target.closest('.lbd,.lba,.lbr,.lbedit'); if (!b) return; const k = b.dataset.k, L = labList(k).slice();
      if (b.classList.contains('lbedit')) { const old = L[+b.dataset.i], v = prompt('نام جدید خدمت:', old); if (v === null || !v.trim()) return; if (L.some((x, i) => i !== +b.dataset.i && nrm(x) === nrm(v.trim()))) { lbMsg(k, 'این نام از قبل وجود دارد'); return; } L[+b.dataset.i] = v.trim(); lbSet(k, L, '✅ نام خدمت تغییر کرد'); }
      else if (b.classList.contains('lbd')) { if ((k === 'cats' || k === 'icats') && L.length < 2) { lbMsg(k, 'حداقل یک برچسب باید بماند'); return; } const name = L[+b.dataset.i]; if (!confirm('«' + name + '» حذف شود؟')) return; const v = L.splice(+b.dataset.i, 1)[0]; lbSet(k, L, '🗑 «' + v + '» حذف شد'); }
      else if (b.classList.contains('lba')) lbAdd(k);
      else if (confirm('این فهرست به حالت اولیه برگردد؟')) lbSet(k, LDEF[k].slice(), '↩️ به حالت اولیه برگشت');
    };
    $('#lbx').onkeydown = e => { if (e.key === 'Enter' && e.target.classList.contains('lbn')) { e.preventDefault(); lbAdd(e.target.dataset.k); } };
    el.insertAdjacentHTML('beforeend', `<div class="card"><b>کد راه‌اندازی</b><div class="mut">فقط نام حساب‌ها و بانک‌ها (آدرس شیت داخلش نیست، پس امن است). کد را به گوشی جدید یا دوستت بده تا بچسباند.</div>
      <textarea id="sk" rows="2" placeholder="EXP1:…"></textarea><div class="row"><button id="sc">ساخت و کپی کد</button><button class="sec" id="sl">اعمال کد</button></div></div>
    <div class="card"><b>راهنمای راه‌اندازی</b><div style="font-size:14px;line-height:1.9">
      ۱. لینک برنامه را در Safari باز کن ← Share ← Add to Home Screen.<br>
      ۲. یک Google Sheet خالی بساز ← Extensions ← Apps Script ← کد Code.gs را بچسبان.<br>
      ۳. Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone. آدرس /exec را بالا بچسبان و «ذخیره و همگام‌سازی» بزن.<br>
      ۴. Shortcuts ← Automation ← New ← Message ← Sender: شمارهٔ بانک ← Run Immediately ← Add Action: «Open URLs» با آدرس برنامه + <span dir="ltr">?sms=</span> و بعدش متغیر Message (Content of Message).<br>
      ۵. اولین پیامک که آمد، شمارهٔ حساب در تنظیمات ظاهر می‌شود؛ نام بانک را بنویس.<br>
      آدرس شیت را به کسی نده؛ هر کس شیت خودش را بسازد.</div></div>
    <div class="card"><b>پیامک‌های دریافتی (${log.length.toLocaleString('fa-IR')})</b>
      <div class="mut">هر پیامکی که به برنامه رسیده اینجاست، حتی ردشده‌ها.</div>
      ${log.slice(0, 30).map((l, i) => `<details style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><summary><span class="mut">${new Date(l.at).toLocaleString('fa-IR')} · ${esc(l.msg)}</span></summary><div style="font-size:13px;white-space:pre-wrap;margin-top:6px">${esc(l.raw || '')}</div><div class="row" style="margin-top:6px">${l.ok || l.rc ? '<span></span>' : l.raw ? `<button class="sec retry" data-i="${i}">تلاش دوباره</button>` : '<span></span>'}<button class="sec logdel" data-i="${i}" style="color:#c0392b;font-size:13px;padding:4px 10px">🗑 حذف</button></div></details>`).join('')}</div>`);
    document.querySelectorAll('.logdel').forEach(b => b.onclick = () => { const l = log[+b.dataset.i]; if (!l || !confirm('این پیامک از فهرست حذف شود؟')) return; const g = JSON.parse(localStorage.getItem('logDel') || '[]'); g.push(l.at); localStorage.setItem('logDel', JSON.stringify(g.slice(-300))); if (l.rc) { tx.forEach(t => { if (t.receipt && t.receipt === l.raw) { delete t.receipt; } }); localStorage.setItem('prc', JSON.stringify(rcPending().filter(r => String(r).trim().slice(0, 1000) !== l.raw))); save(); } log = log.filter(x => x.at !== l.at); saveLog(); render(); });
    document.querySelectorAll('.retry').forEach(b => b.onclick = () => { const r = addSms0(log[+b.dataset.i].raw); if (r.ok) { log[+b.dataset.i].ok = true; log[+b.dataset.i].msg = 'ثبت شد'; saveLog(); tab = 'home'; render(); } else alert(r.msg); });
    $('#nb').onchange = () => { const b = $('#nb').value; if (b === 'بلو') { $('#nk').value = 'بلو'; $('#nn').value = $('#nn').value || 'بلو'; } else if (b && b !== 'other') $('#nn').value = $('#nn').value || b; };
    $('#na').onclick = () => { const k = $('#nk').value.trim(), n = $('#nn').value.trim(); if (!k || !n) { alert('شماره/کلید و نام را پر کن'); return; } if (accounts[k] !== undefined) { alert('این حساب از قبل هست'); return; } accounts[k] = n; save(); render(); };
    document.querySelectorAll('.mvb').forEach(b => b.onclick = () => {
      const k = b.dataset.k, to = b.parentNode.querySelector('.mvs').value;
      if (!to) { alert('اول حساب مقصد را انتخاب کن'); return; }
      const n = tx.filter(t => t.account === k).length;
      if (!confirm(`آیا مطمئنی؟ ${n} تراکنش «${accounts[k]}» به «${accounts[to]}» منتقل می‌شود و حساب «${accounts[k]}» حذف می‌شود.`)) return;
      snap(`ادغام «${accounts[k]}» در «${accounts[to]}»`);
      tx.forEach(t => { if (t.account === k) t.account = to; });
      delete accounts[k]; markDel(k); save(); render();
    });
    document.querySelectorAll('.edk').forEach(b => b.onclick = () => {
      const k = b.dataset.k, nk = (prompt('شمارهٔ حساب جدید (همان که در پیامک می‌آید):', k) || '').trim();
      if (!nk || nk === k) return;
      if (accounts[nk] !== undefined) { alert('این شماره از قبل حساب دارد. از «ادغام» استفاده کن.'); return; }
      const n = tx.filter(t => t.account === k).length;
      if (!confirm(`شمارهٔ «${accounts[k]}» از ${k} به ${nk} تغییر کند؟ ${n} تراکنش حفظ می‌شود.`)) return;
      document.querySelectorAll('.an').forEach(i => { if (i.dataset.k === k) accounts[k] = i.value; });
      snap(`تغییر شماره «${accounts[k]}»`);
      accounts[nk] = accounts[k]; tx.forEach(t => { if (t.account === k) t.account = nk; });
      delete accounts[k]; markDel(k); save(); render();
    });
    document.querySelectorAll('.dlb').forEach(b => b.onclick = () => {
      const k = b.dataset.k, n = tx.filter(t => t.account === k).length;
      if (!confirm(`آیا مطمئنی؟ حساب «${accounts[k]}» حذف می‌شود.` + (n ? ` ${n} تراکنش آن هم برای همیشه پاک می‌شود!` : ''))) return;
      if (n && !confirm('آخرین هشدار: این کار برگشت‌پذیر نیست. ادامه؟')) return;
      snap(`حذف حساب «${accounts[k]}»`);
      tx = tx.filter(t => t.account !== k); delete accounts[k]; markDel(k); save(); render();
    });
    if ($('#undo')) $('#undo').onclick = () => { const u = undo.pop(); tx = u.tx; accounts = u.accounts; localStorage.setItem('delAcc', u.del); save(); render(); alert('برگردانده شد'); };
    $('#sa').onclick = () => { snap('تغییر نام‌ها'); document.querySelectorAll('.an').forEach(i => accounts[i.dataset.k] = i.value); save(); alert('ذخیره شد'); };
    $('#full-backup').onclick = () => {
      try {
        const backup = makeFullBackup(), blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'expense-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        try { localStorage.setItem('lastBackupAt', String(Date.now())); } catch (_) {} refreshInfo159();
        $('#full-backup-msg').textContent = 'فایل آماده شد؛ در دانلودها یا فایل‌های گوشی ذخیره شدن آن را بررسی کن.';
      } catch (err) { $('#full-backup-msg').textContent = 'ساخت فایل ناموفق بود: ' + (err.message || err); }
    };
    $('#category-download').onclick = () => {
      try {
        const saved = localStorage.getItem(CATEGORY_MERGE_BACKUP); validateFullBackup(JSON.parse(saved || 'null'));
        const url = URL.createObjectURL(new Blob([saved], { type: 'application/json' })), link = document.createElement('a');
        link.href = url; link.download = 'expense-before-category-merge.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        $('#full-backup-msg').textContent = 'فایل آماده شد؛ ذخیره‌شدن آن را در فایل‌های گوشی بررسی کن.';
      } catch (err) { $('#full-backup-msg').textContent = 'پشتیبان پیش از ادغام پیدا نشد یا معتبر نیست.'; }
    };
    $('#category-restore').onclick = () => {
      if (!localStorage.getItem(CATEGORY_MERGE_BACKUP)) { $('#full-backup-msg').textContent = 'پشتیبان پیش از ادغام در این دستگاه پیدا نشد.'; return; }
      if (!confirm('دسته‌های ادغام‌شده به حالت قبلی برگردند؟ تراکنش‌های جدید حفظ می‌شوند. تغییرات دسته‌بندی ممکن است در همگام‌سازی بعدی ارسال شود.')) return;
      try { restoreCategoriesBeforeMerge(); $('#full-backup-msg').textContent = 'دسته‌ها بازگردانده شدند.'; render(); }
      catch (err) { $('#full-backup-msg').textContent = 'بازگردانی انجام نشد: ' + (err.message || err); }
    };
    $('#full-restore').onclick = () => $('#full-restore-file').click();
    $('#full-restore-file').onchange = async e => {
      const file = e.target.files[0]; e.target.value = ''; if (!file) return;
      try {
        const data = validateFullBackup(JSON.parse(await file.text())), count = JSON.parse(data.tx).length;
        if (!confirm('این فایل شامل ' + count.toLocaleString('fa-IR') + ' تراکنش است. بازیابی، اطلاعات فعلی این دستگاه را جایگزین می‌کند. ابتدا از اطلاعات فعلی پشتیبان گرفته‌ای؟')) return;
        if (!confirm('پس از بازیابی، اتصال شیت روی این دستگاه قطع می‌شود تا اطلاعات ناخواسته همگام نشوند. بازیابی انجام شود؟')) return;
        const keys = [...new Set([...BACKUP_KEYS, 'dirty', 'lastSync', 'googleTestSheetPending'])], old = {};
        keys.forEach(key => { old[key] = localStorage.getItem(key); });
        clearTimeout(pt); pulled = false;
        try {
          keys.forEach(key => localStorage.removeItem(key));
          Object.entries(data).forEach(([key, value]) => { if (!['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync'].includes(key)) localStorage.setItem(key, value); });
          localStorage.setItem('noSync', '1'); localStorage.setItem('dirty', '1');
        } catch (err) {
          keys.forEach(key => { if (old[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, old[key]); });
          throw err;
        }
        alert('بازیابی انجام شد. اتصال شیت غیرفعال است؛ پیش از وصل کردن دوباره، اطلاعات را بررسی کن.');
        location.reload();
      } catch (err) { $('#full-backup-msg').textContent = 'بازیابی انجام نشد: ' + (err.message || err); }
    };
    $('#ex').onclick = async () => { const s = JSON.stringify({ tx, accounts }); $('#bk').value = s; try { await navigator.clipboard.writeText(s); alert('کپی شد'); } catch { $('#bk').select(); } };
    $('#bf').onclick = () => $('#bfi').click();
    $('#bfi').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const ids = new Set(tx.map(t => String(t.id)));
        const list = [];
        rows.forEach(r => {
          const d = r[17];
          if (typeof d !== 'string' || !/^\d{4}\/\d{2}\/\d{2}/.test(d)) return;
          const deposit = Number(r[3]) || 0, withdraw = Number(r[2]) || 0;
          const kind = String(r[6] || ''), desc = String(r[10] || '');
          const credit = deposit > 0;
          const amount = credit ? deposit : withdraw;
          if (!amount) return;
          let cat = credit ? 'سایر' : 'خرید';
          list.push({ id: Number(r[15]) || (Date.parse(d) + list.length), bank: 'سامان', account: '', type: credit ? 'credit' : 'debit', amount, balance: Number(r[1]) || 0, date: d.slice(0, 16), desc: kind || desc.slice(0, 60), cat, pending: false, raw: desc.slice(0, 2000) });
        });
        const add = list.filter(t => !ids.has(String(t.id)));
        if (!list.length) { alert('هیچ تراکنشی در فایل پیدا نشد. فایل را از گزارش بانک سامان بگیر.'); return; }
        let tgt = Object.keys(accounts).find(k => /^\d{6,}$/.test(k) && accounts[k].includes('سامان'));
        if (!tgt) { tgt = 'سامان'; if (!accounts[tgt]) accounts[tgt] = 'سامان'; }
        add.forEach(t => { t.account = tgt; tx.push(t); });
        save(); alert(`${add.length} تراکنش جدید اضافه شد (${list.length - add.length} تکراری رد شد).`); tab = 'home'; render();
      } catch (err) { alert('خواندن فایل ناموفق بود: ' + err.message); }
      e.target.value = '';
    };
    $('#mgx').onclick = () => { try { const d = JSON.parse($('#bk').value); const ids = new Set(tx.map(t => String(t.id))); let n = 0; d.tx.forEach(t => { if (!ids.has(String(t.id))) { tx.push(t); n++; } }); Object.assign(accounts, d.accounts || {}); save(); alert(n + ' تراکنش اضافه شد'); render(); } catch { alert('متن نامعتبر است'); } };
    $('#im').onclick = () => { try { const d = JSON.parse($('#bk').value); tx = d.tx; accounts = d.accounts; save(); alert('بازیابی شد'); } catch { alert('متن نامعتبر است'); } };
    $('#sc').onclick = async () => { const c = 'EXP1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ accounts })))); $('#sk').value = c; try { await navigator.clipboard.writeText(c); alert('کد کپی شد'); } catch { $('#sk').select(); } };
    $('#sl').onclick = () => { try { const v = $('#sk').value.trim().replace(/^EXP1:/, ''); const d = JSON.parse(decodeURIComponent(escape(atob(v)))); accounts = { ...d.accounts, ...accounts }; save(); alert('راه‌اندازی شد'); pulled = false; pull().then(render); render(); } catch { alert('کد نامعتبر است'); } };
    if ($('#ul')) $('#ul').onclick = () => { if (confirm('قفل آدرس شیت باز شود؟ فقط اگر شیت جدید می‌خواهی.')) { localStorage.removeItem('syncLock'); localStorage.removeItem('sync_bak'); pulled = false; render(); } };
    if ($('#sy')) $('#sy').onclick = async () => { if ($('#su')) localStorage.setItem('sync', $('#su').value.trim()); pulled = false; syncMsg = 'در حال اتصال…'; render(); await pull(); render(); };
    if ($('#easy-main-sync')) $('#easy-main-sync').onclick = async () => {
      const url = easyMainSyncUrl();
      if (!url) { alert('آدرس اصلی معتبر پیدا نشد؛ ابتدا ساخت اتصال آسان را کامل کن.'); return; }
      if (legacyInFlight || googleTestBusy || directAutoSession || directAutoRunning) { alert('ابتدا عملیات دیگر و ارسال خودکار اتصال مستقیم را متوقف کن.'); return; }
      if (!confirm('دریافت از شیت آدرس اصلی انجام شود؟ اطلاعات این گوشی ممکن است با داده‌های شیت ترکیب و تغییر کند. ابتدا از شیت و برنامه پشتیبان بگیر. در این مرحله چیزی به شیت ارسال نمی‌شود.')) return;
      if (legacyInFlight || googleTestBusy || directAutoSession || directAutoRunning || easyMainSyncUrl() !== url || localStorage.getItem('legacySyncPaused') !== '1') { alert('وضعیت اتصال تغییر کرد؛ دوباره تلاش کن.'); return; }
      const button = $('#easy-main-sync'), status = $('#easy-main-sync-status');
      button.disabled = true; googleTestBusy = true;
      status.textContent = 'در حال همگام‌سازی با آدرس اصلی…';
      try { await pull(url); status.textContent = syncMsg; }
      finally { googleTestBusy = false; button.disabled = false; }
    };
    if ($('#easy-main-use')) $('#easy-main-use').onclick = () => {
      const url = easyMainSyncUrl();
      if (!url) { alert('آدرس اصلی معتبر پیدا نشد؛ ابتدا ساخت اتصال آسان را کامل کن.'); return; }
      if (legacyInFlight) { alert('همگام‌سازی در جریان است؛ پس از پایان آن دوباره تلاش کن.'); return; }
      if (!confirm('آدرس اتصال به شیت جدید تغییر کند؟ همگام‌سازی بعدی ممکن است اطلاعات این گوشی و شیت جدید را تغییر دهد. ابتدا از هر دو پشتیبان بگیر.')) return;
      if (legacyInFlight || easyMainSyncUrl() !== url) { alert('وضعیت اتصال تغییر کرد؛ دوباره تلاش کن.'); return; }
      const old = localStorage.getItem('sync');
      if (old && old !== url) localStorage.setItem('sync_bak', old);
      clearTimeout(pt); pulled = false;
      localStorage.setItem('sync', url);
      syncMsg = 'آدرس اصلی جدید ذخیره شد. برای شروع، وضعیت اتصال و پشتیبان را بررسی کن.';
      alert(localStorage.getItem('legacySyncPaused') === '1' ? 'آدرس ذخیره شد؛ اتصال قدیمی همچنان متوقف است.' : 'آدرس اصلی جدید ذخیره شد.');
      render();
    };
    { const key = t => [t.account, t.type, t.amount, t.date].join('|');
      const G = {}; tx.filter(t => !t.ghost && t.date).forEach(t => (G[key(t)] = G[key(t)] || []).push(t));
      const D = Object.values(G).filter(g => g.length > 1 && g.every(x => x.balance == null || g[0].balance == null || x.balance === g[0].balance));
      el.insertAdjacentHTML('beforeend', `<div class="card" id="dpc"><b>🔁 تراکنش‌های تکراری</b>${D.length ? `<div class="mut">${D.length} گروه پیدا شد. با «ادغام» یکی نگه داشته می‌شود و اطلاعات (رسید، شخص، توضیح) با هم ترکیب می‌شود.</div>` + D.map((g, i) => `<div class="row" style="margin-top:8px"><span>${toman(g[0].amount)} تومان × ${g.length}<div class="mut">${esc(g[0].date)} · ${esc(accName(g[0].account))}</div></span><button class="dpm" data-i="${i}">ادغام</button></div>`).join('') + '<button id="dpa" style="margin-top:8px">ادغام همه</button>' : '<div class="mut">موردی پیدا نشد ✅</div>'}</div>`);
      const merge = g => { const sc = t => (t.receipt ? 4 : 0) + (t.person ? 2 : 0) + (t.desc ? 1 : 0) + (t.cat ? 1 : 0); const k = g.slice().sort((a, b) => sc(b) - sc(a))[0]; g.forEach(o => { if (o === k) return; for (const f in o) if (k[f] === undefined || k[f] === '' || k[f] === null) k[f] = o[f]; tx.forEach(c => { if (c.parent === o.id) c.parent = k.id; }); }); const ids = new Set(g.filter(o => o !== k).map(o => o.id)); tx = tx.filter(t => !ids.has(t.id)); };
      $('#dpc').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'dpa') D.forEach(merge); else if (b.classList.contains('dpm')) merge(D[+b.dataset.i]); else return; save(); render(); };
    }
    accordion(el, 'settings');
    settingsLayout(el);
    el.insertAdjacentHTML('afterbegin', `<div class="card" id="settings-info"><b>وضعیت کلی اطلاعات</b><div id="settings-info-content">${settingsInfo159()}</div></div><div class="card" id="welcome-sync"><b>ورود به گوگل و اتصال برنامه</b><div class="mut">پس از ورود، همگام‌سازی تا وقتی برنامه باز است انجام می‌شود.</div><button type="button" id="welcome-google">ورود به گوگل</button> <button type="button" class="sec" id="welcome-later">بعداً</button></div>`);
    refreshInfo159();
    const budgetCard = document.getElementById('budget-settings'); if (budgetCard) budgetCard.hidden = !featureOn('budget');
    const inboxCard = document.getElementById('legacy-inbox'); if (inboxCard) inboxCard.hidden = !featureOn('sms');
    el.insertAdjacentHTML('beforeend', `<div style="text-align:center;margin:18px 0 6px"><div style="display:inline-block;padding:8px 18px;border-radius:14px;background:linear-gradient(135deg,#eef3ff,#f7eefc);border:1px solid #dde3f5;font-size:13px;color:#445">🕒 زمان آماده‌سازی این نسخه (نسخه ${BUILD_VERSION})<br><b style="font-size:15px">${new Date(BUILD).toLocaleString('fa-IR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Tehran' })}</b></div><div style="font-size:10px;color:#999;margin-top:6px">داود هراتی</div></div>`);
  }
}

// فقط جای کارت‌های موجود را عوض می‌کند؛ خود کارت‌ها و رویدادهایشان حفظ می‌شوند.
function settingsLayout(el) {
  const cards = [...el.children].filter(c => c.tagName === 'DETAILS');
  const admin = el.querySelector ? el.querySelector('#easy-admin') : null;
  const groups = [ ['settings-simple', 'تنظیمات ساده'], ['settings-tools', 'ابزارهای پرکاربرد'], ['settings-advanced', 'پیشرفته و حرفه‌ای'], ['settings-admin', 'مدیریت'] ].map(([id, text]) => {
    const group = document.createElement('details'); group.className = 'card'; group.id = id;
    const summary = document.createElement('summary'); summary.textContent = text; group.appendChild(summary); return group;
  });
  const advanced = new Set(['legacy-sync-settings', 'google-test', 'google-copy', 'direct-sync', 'easy-setup', 'dpc']);
  const tools = new Set(['legacy-inbox', 'budget-settings']);
  cards.forEach(card => {
    const title = (card.querySelector('summary')?.textContent || '').trim();
    const group = advanced.has(card.id) || /پشتیبان|بازگردانی|پاک.سازی|شروع از صفر|کد راه‌اندازی/.test(title) ? groups[2]
      : tools.has(card.id) || /نام حساب|پیامک‌های دریافتی|یادآور/.test(title) ? groups[1] : groups[0];
    group.appendChild(card);
  });
  if (admin) { groups[3].appendChild(admin); groups[3].hidden = admin.hidden; }
  else groups[3].hidden = true;
  groups.forEach(group => el.appendChild(group));
}

// کارت‌ها را کشویی می‌کند و ترتیب پیش‌فرض/دلخواه (با ▲▼) را اعمال می‌کند
function invoiceStartEditing() {
  if (tab !== 'report' || (topic !== 'invoices' && topic !== 'sales')) return;
  tab = 'add';
  document.querySelectorAll('nav button').forEach(button => button.classList.toggle('on', button.dataset.t === tab));
  document.getElementById('invoice-form-fields').hidden = false;
  const ledger = document.querySelector('.invoice-ledger'); if (ledger) ledger.hidden = true;
  document.querySelector('#invoice-card > summary b').textContent = '🧾 ویرایش فاکتور';
}
function invoiceRefreshReport() {
  if (tab !== 'report' || (topic !== 'invoices' && topic !== 'sales')) return;
  const ledger = document.querySelector('.invoice-ledger');
  if (ledger) {
    const wasOpen = ledger.open;
    ledger.outerHTML = invoiceLedgerHtml(invoiceList().filter(item => topic !== 'sales' || item.kind === 'فروش'));
    document.querySelector('.invoice-ledger').open = wasOpen;
  }
}
const DEF_ORD = { settings: ['اتصال مستقیم', 'نسخه پشتیبان', 'پشتیبان‌گیری', 'پیامک‌های شورتکات', 'نام حساب', 'برچسب', 'شغل', 'پیامک‌های دریافتی', 'آزمایش ورود', 'همگام‌سازی با Google Sheets', 'کد راه', 'راهنما'], add: [] };
const openSt = {};
document.addEventListener('toggle', e => { const d = e.target; if (d.classList && d.classList.contains('acc')) { const t = d.querySelector('summary').textContent.replace(/[▲▼]/g, '').trim(); openSt[t] = d.open; } }, true);
function accordion(el, key) {
  [...el.children].forEach(c => {
    if (!c.classList.contains('card') || c.tagName === 'DETAILS' || c.classList.contains('noacc')) return;
    const b = c.querySelector('b'); if (!b) return;
    const d = document.createElement('details'); d.className = 'card acc';
    if (c.style.cssText) d.style.cssText = c.style.cssText;
    const s = document.createElement('summary'); s.appendChild(b);
    d.appendChild(s); while (c.firstChild) d.appendChild(c.firstChild);
    if (c.id) d.id = c.id;
    c.replaceWith(d);
  });
  const items = [...el.children].filter(c => c.tagName === 'DETAILS');
  const ttl = c => c.querySelector('summary').textContent.replace(/[▲▼]/g, '').trim();
  const saved = load('ord_' + key, null), def = DEF_ORD[key] || [];
  const rank = c => { const t = ttl(c); if (saved) { const i = saved.indexOf(t); return i < 0 ? 999 : i; } const i = def.findIndex(w => t.includes(w)); return i < 0 ? 50 : i; };
  items.map((c, i) => [c, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).forEach(([c]) => el.appendChild(c));
  items.forEach(c => { const t = ttl(c); if (t in openSt) c.open = openSt[t]; });
  const ord = () => localStorage.setItem('ord_' + key, JSON.stringify([...el.children].filter(x => x.tagName === 'DETAILS').map(ttl)));
  [...el.children].filter(c => c.tagName === 'DETAILS').forEach(c => {
    const s = c.querySelector('summary'); if (s.dataset.dg) return; s.dataset.dg = 1;
    let timer = null, drag = false, sy = 0, lastY = 0;
    const cancel = () => { clearTimeout(timer); timer = null; };
    const end = () => { cancel(); if (drag) { c.classList.remove('dragging'); c.style.transform = ''; ord(); setTimeout(() => drag = false, 50); } };
    s.addEventListener('pointerdown', e => { sy = lastY = e.clientY; timer = setTimeout(() => { drag = true; c.classList.add('dragging'); if (navigator.vibrate) navigator.vibrate(30); }, 450); });
    s.addEventListener('pointermove', e => { if (!drag) { if (Math.abs(e.clientY - sy) > 8) cancel(); return; } });
    window.addEventListener('pointermove', e => {
      if (!drag || !c.classList.contains('dragging')) return;
      lastY = e.clientY;
      const L = [...el.children].filter(x => x.tagName === 'DETAILS');
      for (const o of L) { if (o === c) continue; const r = o.getBoundingClientRect(); if (lastY > r.top && lastY < r.bottom) { const after = L.indexOf(o) > L.indexOf(c); el.insertBefore(c, after ? o.nextSibling : o); break; } }
      const me = c.getBoundingClientRect(); c.style.transform = 'translateY(' + (lastY - (me.top + me.height / 2)) + 'px)';
    });
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    s.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
    s.addEventListener('click', e => { if (drag) { e.preventDefault(); e.stopPropagation(); } }, true);
    s.addEventListener('contextmenu', e => e.preventDefault());
  });
}

// ---- فیلتر حساب و رنگ بانک ----
let sel = load('sel', null); // null = همه
const PAL = ['#2563eb', '#0f766e', '#7c3aed', '#ea580c', '#db2777', '#0891b2'];
const accColor = a => PAL[Math.abs([...String(a)].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % PAL.length];
const allAccs = () => [...new Set([...Object.keys(accounts), ...tx.map(t => t.account)])];
const isSel = a => !sel || sel.includes(a);
const badge = a => `<span class="bdg" style="background:${accColor(a)}22;color:${accColor(a)}">${esc(accName(a))}</span>`;
function filterBar() {
  const all = allAccs();
  return `<div class="chips fb"><button class="chip ${!sel ? 'on' : 'sec'}" data-a="*">همه حساب‌ها</button>${all.map(a => `<button class="chip ${sel && sel.includes(a) ? 'on' : 'sec'}" data-a="${esc(a)}" style="${sel && sel.includes(a) ? 'background:' + accColor(a) : ''}">${esc(accName(a))}</button>`).join('')}</div>
  <div class="mut" style="margin:-4px 0 10px">${!sel ? 'مجموع همهٔ حساب‌ها' : sel.length === 1 ? 'فقط ' + esc(accName(sel[0])) : 'مجموع ' + sel.length.toLocaleString('fa-IR') + ' حساب انتخاب‌شده'} · برای انتخاب چند حساب روی هرکدام بزن</div>`;
}
let ord = localStorage.getItem('ord') || 'sms';
function ordTx(l) { return [...l].sort(ord === 'sms' ? (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id) : (a, b) => b.id - a.id); }
function ordBar() { return `<div class="chips"><span class="mut" style="align-self:center">مرتب‌سازی:</span><button class="chip ordb ${ord === 'sms' ? 'on' : 'sec'}" data-o="sms">تاریخ پیامک</button><button class="chip ordb ${ord === 'entry' ? 'on' : 'sec'}" data-o="entry">زمان ورود به برنامه</button></div>`; }
const fmt = ms => ms ? new Date(ms).toLocaleString('fa-IR') : '—';
// اطلاعات نمایشی؛ ذخیره‌نشدن آن نباید روند اتصال را تغییر دهد.
function noteSyncSuccess159() { try { localStorage.setItem('lastSyncOk', String(Date.now())); } catch (_) {} }
function infoStatus159() {
  const direct = load('directSyncState', null), easy = typeof easyState === 'function' ? easyState() : {};
  const directLive = !!(directAutoSession && directAutoSession.expires > Date.now() && /^✅/.test(directAutoStatus));
  const legacyLive = !directLive && !!(typeof pulled !== 'undefined' && pulled && /^✅/.test(syncMsg));
  const live = !accountOwnerLocked() && (directLive || legacyLive);
  const stamp = Math.max(Number(localStorage.getItem('lastSyncOk')) || 0, Number(localStorage.getItem('lastSync')) || 0);
  const backup = Number(localStorage.getItem('lastBackupAt') || 0);
  const legacyUrl = localStorage.getItem('sheetUrl') || '';
  const hasDirect = !!(direct && direct.id), hasLegacy = !hasDirect && !!legacyUrl;
  const email = hasDirect ? (direct.email || '') : hasLegacy ? '' : (easy.email || '');
  const sheetId = hasDirect ? direct.id : hasLegacy ? '' : (easy.sheetId || '');
  const sheetLabel = !hasDirect && !hasLegacy && sheetId ? 'شیت آزمایشی' : 'شیت';
  const validSheet = /^[A-Za-z0-9_-]+$/.test(sheetId) ? 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sheetId) + '/edit' : '';
  const sheetUrl = validSheet || (/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+(?:\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/.test(legacyUrl) ? legacyUrl : '');
  const kind = direct && direct.id ? 'مستقیم' : localStorage.getItem('legacySyncPaused') === '1' ? 'اتصال قدیمی متوقف است' : legacyLive ? 'قدیمی' : 'قطع یا بررسی‌نشده';
  const error = accountOwnerLocked() ? ACCOUNT_OWNER_LOCK_MESSAGE : [directAutoStatus, syncMsg].find(x => typeof x === 'string' && /⚠️|ناموفق|قطع شد|قطع است/.test(x)) || '';
  return { live, stamp, backup, email, sheetId, sheetLabel, sheetUrl, kind, error, owner: localStorage.getItem('dataOwner') || '' };
}
function settingsInfo159() {
  const s = infoStatus159();
  const stamp = s.stamp ? fmt(s.stamp) : 'هنوز ثبت نشده';
  const backup = s.backup ? fmt(s.backup) + ' (آماده‌سازی فایل؛ ذخیره در گوشی را بررسی کن)' : 'هنوز بکاپی ثبت نشده';
  return '<div><b>' + (s.live ? 'وصل ✅' : 'قطع یا بررسی‌نشده ❌') + '</b> · آخرین همگام‌سازی: ' + esc(stamp) + '</div>' +
    '<div class="mut">حساب گوگل: ' + esc(s.email || 'وصل نیست') + '</div>' +
    '<div class="mut">' + esc(s.sheetLabel) + ': ' + (s.sheetUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + esc(s.sheetUrl) + '">' + esc(s.sheetId ? 'باز کردن شیت (…' + s.sheetId.slice(-8) + ')' : 'باز کردن شیت') + '</a>' : 'وصل نیست') + '</div>' +
    '<div class="mut">نوع اتصال: ' + esc(s.kind) + '</div>' +
    '<div class="mut">آخرین خطای فعلی: ' + esc(s.error || 'ندارد') + '</div>' +
    '<div class="mut">آخرین پشتیبان: ' + esc(backup) + '</div>' +
    '<div class="mut">تراکنش‌ها: ' + tx.length.toLocaleString('fa-IR') + ' · حساب‌ها: ' + Object.keys(accounts).length.toLocaleString('fa-IR') + '</div>' +
    '<div class="mut">مالک داده‌ها: ' + esc(s.owner || 'مشخص نشده') + '</div>';
}
function refreshInfo159() {
  const info = document.getElementById('settings-info-content'); if (info) info.innerHTML = settingsInfo159();
  const button = document.getElementById('welcome-google'); if (button) { const live = !!(directAutoSession && directAutoSession.expires > Date.now()); button.disabled = live; button.textContent = live ? 'ورود گوگل فعال است' : 'ورود به گوگل'; }
}
function homeSyncStatus() {
  if (accountOwnerLocked()) return '⚠️ ' + ACCOUNT_OWNER_LOCK_MESSAGE;
  const direct = load('directSyncState', null);
  if (direct && direct.id && direct.base) {
    if (directAutoSession && Date.now() < directAutoSession.expires) return 'اتصال مستقیم: ' + directAutoStatus;
    return 'اتصال مستقیم تنظیم شده؛ همگام‌سازی خودکار فعال نیست. ' + directAutoStatus;
  }
  const ls = +localStorage.getItem('lastSync') || 0, dirty = localStorage.getItem('dirty');
  return 'شیت قدیمی: ' + (!SYNC() ? 'وصل نیست' : dirty ? '⏳ تغییر ارسال‌نشده دارد' : ls ? '✅ آخرین ذخیره ' + fmt(ls) : 'هنوز چیزی ارسال نشده');
}
function statusCard() {
  const l = log[0], lt = tx.reduce((m, t) => (t.id > (m?.id || 0) ? t : m), null);
  return `<div class="card"><b>آخرین وضعیت</b>
   <div class="mut" style="margin-top:6px">آخرین پیامک رسیده: ${l ? fmt(l.at) + ' · ' + (l.ok ? '✅ ' : '⚠️ ') + esc(l.msg) : 'هنوز نیامده'}</div>
   <div class="mut">آخرین تراکنش ثبت‌شده: ${lt ? fmt(lt.id) + ' · ' + esc(lt.desc || (lt.pending ? 'منتظر توضیح' : '—')) : '—'}</div>
   <div class="mut" id="home-sync-status">${esc(homeSyncStatus())}</div>
   ${load('directSyncState', null)?.id ? `<button type="button" id="home-direct-start" style="margin-top:8px" ${directAutoSession ? 'hidden' : ''}>اتصال خودکار به گوگل</button>` : ''}
   <div class="mut">${esc(syncMsg)}</div></div>`; }
function workPayments(p, L) {
  const mine = L.filter(t => t.person === p);
  const jobs = mine.filter(t => t.loan === 'share').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  let pool = mine.filter(t => t.loan === 'wage').reduce((s, t) => s + t.amount, 0);
  const rows = jobs.map(j => { const paid = Math.max(0, Math.min(j.amount, pool)); pool -= paid; return { j, paid, left: j.amount - paid }; });
  return { rows, pool };
}
function workList(p, L) {
  const { rows, pool } = workPayments(p, L);
  const row = ({ j, paid, left }) => {
    const par = j.parent ? tx.find(x => x.id === j.parent) : null;
    const src = par ? `از واریزی ${toman(par.amount)} تومان${par.shareMode === 'fixed' ? ' · مبلغ ثابت' : par.pct ? ' · ' + Number(par.pct).toLocaleString('fa-IR') + '٪' : ''}${par.customer ? ' · ' + esc(par.customer) + (par.ctype === 'driver' ? ' (راننده)' : '') : ''}${par.service ? ' · خدمت: ' + esc(par.service) : ''}` : 'ثبت دستی';
    const st = left === 0 ? '<span class="grn">✓ پرداخت‌شده</span>' : paid ? `<span class="red">مانده ${toman(left)}</span>` : '<span class="red">پرداخت‌نشده</span>';
    return `<div class="card"><div class="row mut"><b>${esc((j.desc || '').replace(/^سهم \d+٪ همکار از /, '') || 'کار')}</b><b>${toman(j.amount)} تومان</b></div><div class="mut">${esc(j.date)} · ${src}</div><div class="row" style="margin-top:4px"><span>${st}</span>${paid && left ? `<span class="mut">پرداخت‌شده ${toman(paid)}</span>` : ''}<button type="button" class="sec workreview" data-id="${j.id}">مرور</button></div></div>`;
  };
  const un = rows.filter(r => r.left > 0), pd = rows.filter(r => r.left === 0);
  const sum = un.reduce((s, r) => s + r.left, 0);
  if (!rows.length) return '';
  return `<details class="card"><summary><b>🧾 کارکردها</b> <span class="mut">(${un.length.toLocaleString('fa-IR')} پرداخت‌نشده · ${pd.length.toLocaleString('fa-IR')} پرداخت‌شده)</span></summary>
  <div class="mut" style="margin:4px 0">پرداخت‌ها به‌ترتیب تاریخ روی قدیمی‌ترین کارها حساب می‌شوند.${pool > 0 ? ' پیش‌پرداخت مازاد: ' + toman(pool) + ' تومان.' : ''}</div>
  ${un.length ? `<b class="red">پرداخت‌نشده · ${toman(sum)} تومان</b>${un.map(row).join('')}` : ''}
  ${pd.length ? `<b class="grn">✓ پرداخت‌شده (${pd.length.toLocaleString('fa-IR')})</b>${pd.map(row).join('')}` : ''}</details>`;
}
let lp = null, showAssistantTotal = false;

const BUILD = '2026-11-13T12:52:43.488Z'; const BUILD_VERSION = '۱۶۰';

document.addEventListener('input', event => { if (event.target.id === 'wa') invoiceAmountInput(event.target); });
function pdfPerson(p, layout = 'table') {
  const L = tx.filter(t => t.loan && t.person === p).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const isCo = cols()[p] !== undefined; let bal = 0, wageBal = 0, loanBal = 0, sh = 0, pd = 0;
  const rows = L.map(t => { const v = LOAN[t.loan][1] * t.amount; bal += v; if (isWage(t)) wageBal += v; else loanBal += v; if (t.loan === 'share') sh += t.amount; if (t.loan === 'wage') pd += t.amount;
    const pr = t.parent ? tx.find(x => x.id === t.parent) : null; let d = t.desc && !Object.values(LOAN).some(x => x[0] === t.desc) ? t.desc : '';
    if (pr) { if (pr.service) d += ' · خدمات: ' + pr.service; if (pr.customer && !d.includes(pr.customer)) d += ' · مشتری: ' + pr.customer; }
    if (t.loan === 'wage' && t.receipt) d = (d ? d + ' · ' : '') + 'طبق رسید' + ((t.receipt || '').match(/\d{1,2}:\d{2}/) ? ' (ساعت ' + t.receipt.match(/\d{1,2}:\d{2}/)[0] + ')' : '');
    return layout === 'linear' ? `<div class="lineitem"><div class="linetop"><b>${esc(LOAN[t.loan][0])}</b><strong>${toman(t.amount)} تومان</strong></div><div class="muted">${esc(t.date || '')}</div>${d ? `<div>${esc(d)}</div>` : ''}<div class="muted">مانده دستمزد: ${toman(wageBal)} تومان · مانده قرض: ${toman(loanBal)} تومان</div></div>` : `<tr><td>${esc(String(t.date || '').slice(0, 10))}</td><td>${LOAN[t.loan][0]}</td><td>${esc(d)}</td><td class="n ${t.loan === 'share' ? 'a' : 'b'}">${toman(t.amount).toLocaleString('fa-IR')}</td><td class="n">${toman(wageBal)}</td><td class="n">${toman(loanBal)}</td></tr>`; }).join('');
  const f = n => toman(Math.abs(n)).toLocaleString('fa-IR');
  const st = bal > 0 ? 'پیش‌پرداخت: ' + f(bal) : bal < 0 ? (isCo ? 'مانده دستمزد: ' : 'بدهی: ') + f(bal) : 'تسویه کامل';
  const h = `<html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>حساب ${esc(p)}</title><style>@page{margin:16mm}body{font-family:Tahoma,sans-serif;padding:20px;color:#24332f;line-height:1.7}h2{margin:0;color:#0f766e;font-size:23px}.intro{border-bottom:3px solid #0f766e;padding-bottom:14px;margin-bottom:18px}.intro div{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th{background:#e7f4f1;color:#115e59}td,th{border-bottom:1px solid #dce9e5;padding:9px 6px;text-align:right;vertical-align:top}tr{page-break-inside:avoid}tr:nth-child(even){background:#f7faf9}.n{text-align:left;white-space:nowrap}.a{color:#16803d}.b{color:#bd3636}.lineitem{padding:12px 0;border-bottom:1px solid #dce9e5;page-break-inside:avoid}.linetop{display:flex;justify-content:space-between;gap:12px}.linetop strong{color:#0f766e;white-space:nowrap}.muted{font-size:11px;color:#64748b}.s{margin-top:18px;font-size:13px;line-height:2;background:#f0f8f5;border-right:4px solid #0f766e;padding:12px 16px}</style></head><body><div class="intro"><h2>صورت‌حساب ${esc(p)}</h2><div>گزارش کارکرد، پرداخت و قرض · تاریخ تهیه: ${new Date().toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })}</div></div>
  ${layout === 'linear' ? (rows || '<div class="muted">ردیفی ثبت نشده است.</div>') : `<table><tr><th>تاریخ</th><th>نوع</th><th>شرح</th><th>مبلغ (تومان)</th><th>مانده دستمزد</th><th>مانده قرض</th></tr>${rows}</table>`}
  <div class="s"><b>جمع و مانده حساب</b><br>${isCo ? `مجموع کارکرد: <b>${f(sh)}</b><br>پرداخت دستمزد: <b>${f(pd)}</b><br>مانده دستمزد: <b>${wageBal > 0 ? 'پیش‌پرداخت' : wageBal < 0 ? 'بدهی من' : 'تسویه'} ${f(wageBal)}</b><br>مانده قرض: <b>${loanBal > 0 ? 'طلب من' : loanBal < 0 ? 'بدهی من' : 'تسویه'} ${f(loanBal)}</b>${showAssistantTotal ? `<br>جمع دو حساب: <b>${bal > 0 ? 'طلب من' : bal < 0 ? 'بدهی من' : 'تسویه'} ${f(bal)} تومان</b>` : ''}` : `وضعیت: <b>${st} تومان</b>`}</div></body></html>`;
  const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column';
  ov.innerHTML = '<div style="display:flex;gap:8px;padding:10px;border-bottom:1px solid #ddd"><button id="pdx" style="flex:1">✕ بستن</button><button id="pdp" style="flex:1">🖨 چاپ / ذخیره PDF</button></div><iframe style="flex:1;border:0;width:100%"></iframe>';
  document.body.appendChild(ov); const fr = ov.querySelector('iframe'); fr.srcdoc = h;
  ov.querySelector('#pdx').onclick = () => ov.remove(); ov.querySelector('#pdp').onclick = () => { fr.contentWindow.focus(); fr.contentWindow.print(); };
}
function balanceText(v, kind) {
  if (!v) return 'تسویه است';
  if (kind === 'wage') return v > 0 ? 'پیش‌پرداخت دستمزد: ' + toman(v) + ' تومان' : 'دستمزد پرداخت‌نشده: ' + toman(-v) + ' تومان';
  return v > 0 ? 'او به من بدهکار است: ' + toman(v) + ' تومان' : 'من به او بدهکارم: ' + toman(-v) + ' تومان';
}
function loansHtml() {
  const L = tx.filter(t => t.loan && LOAN[t.loan] && (isWage(t) ? featureOn('assistant') : featureOn('loan'))), CO = cols(), PJ = pjobs();
  const names = [...new Set([...(featureOn('assistant') ? Object.keys(CO) : []), ...(featureOn('assistant') ? Object.keys(PJ) : []), ...L.map(t => t.person).filter(Boolean)])];
  const wage = p => amountOf(L.filter(t => t.person === p && isWage(t)));
  const loan = p => amountOf(L.filter(t => t.person === p && !isWage(t)));
  const combined = p => wage(p) + loan(p);
  if (lp && names.includes(lp)) {
    const isCo = CO[lp] !== undefined, w = wage(lp), l = loan(lp), all = combined(lp);
    const rows = ordTx(L.filter(t => t.person === lp));
    const workStatus = new Map(workPayments(lp, L).rows.map(x => [String(x.j.id), x]));
    const result = all > 0 ? 'او به من بدهکار است: ' + toman(all) : all < 0 ? 'من به او بدهکارم: ' + toman(-all) : 'حساب صاف است';
    return `<button class="sec" id="lb">‹ بازگشت</button><div class="hero"><div>${esc(lp)}</div><div style="margin-top:12px;font-size:13px;opacity:.85">${isCo ? (w > 0 ? 'پیش‌پرداخت دستمزد' : w < 0 ? 'دستمزد پرداخت‌نشده' : 'حساب دستمزد') : 'دستمزد'}</div><div class="big">${isCo && w ? toman(Math.abs(w)) + ' <small>تومان</small>' : 'تسویه'}</div><div style="margin-top:12px;font-size:13px;opacity:.85">قرض</div><div style="font-size:20px;font-weight:700">${balanceText(l, 'loan')}</div>${isCo ? `<label style="display:flex;align-items:center;gap:8px;margin-top:12px"><input id="combinebalances" type="checkbox" style="width:auto;margin:0" ${showAssistantTotal ? 'checked' : ''}> نمایش جمع دو حساب</label><div class="combinedbalance" ${showAssistantTotal ? '' : 'hidden'} style="margin-top:6px">جمع دو حساب: <b>${result}${all ? ' تومان' : ''}</b><div style="font-size:12px">فقط نمایش جمع است؛ قرض و دستمزد جدا می‌مانند.</div></div>` : ''}</div>
    <button id="pdfb" style="width:100%;margin:8px 0">📄 خروجی PDF حساب</button><div id="pdfchoices" class="card hide"><b>نوع خروجی را انتخاب کن</b><div class="row" style="margin-top:8px"><button id="pdftable">جدولی</button><button id="pdflinear">خطی</button><button class="sec" id="pdfcancel">انصراف</button></div></div><details class="card"><summary><b>مشخصات</b></summary><div class="mut">کار: <input id="pj" value="${esc(PJ[lp] || '')}" placeholder="مثلاً تعمیرکار"></div><select id="pcb"><option value="1"${isCo ? ' selected' : ''}>👷 دستیار</option><option value=""${isCo ? '' : ' selected'}>🤝 شخص عادی (قرض)</option></select><div class="mut">درصد سهم: <input id="ppc" type="number" min="0" max="100" value="${isCo ? CO[lp] : ''}" style="width:80px"> ٪</div><button id="psv">ذخیره</button> <button class="sec" id="pdel" style="color:#c0392b">🗑 حذف شخص</button></details>
    ${isCo && featureOn('assistant') ? `<details class="card"><summary><b>➕ ثبت کارکرد دستیار</b></summary><div class="mut">مبلغ کارکرد به دستمزد پرداخت‌نشده اضافه می‌شود.</div><input id="wd" placeholder="شرح کار"><input id="wa" type="text" inputmode="numeric" placeholder="مبلغ سهم (تومان)">${persianDateFields('wdt')}<button id="wadd">ثبت کارکرد</button></details>` : ''}
    <details class="card"><summary><b>➕ مانده حساب از قبل یا ثبت دستی</b></summary><div class="mut">برای ثبت حسابی که از قبل داشته‌اید یا یک مبلغ دستی؛ این ثبت موجودی بانکی را تغییر نمی‌دهد.</div><select id="manualkind"><option value="">نوع حساب را انتخاب کن…</option>${isCo ? '<option value="share">دستمزد: من بابت کارکرد به او بدهکارم</option><option value="wage">دستمزد: قبلاً به او پیش‌پرداخت داده‌ام</option>' : ''}<option value="lent" ${featureOn('loan') ? '' : 'hidden'}>قرض: او به من بدهکار است</option><option value="borrowed" ${featureOn('loan') ? '' : 'hidden'}>قرض: من به او بدهکارم</option></select><input id="manualamount" type="text" inputmode="numeric" placeholder="مبلغ به تومان">${persianDateFields('manualdate')}<input id="manualdesc" placeholder="توضیح (اختیاری، مثلاً مانده از قبل)"><button id="manualsave">ثبت در حساب</button></details>
    <div id="workreviewbox"></div>${isCo ? workList(lp, L) : ''}${ordBar()}${rows.map(t => rowHtml(t, workStatus)).join('')}`;
  }
  const addP = `<details class="card"><summary><b>➕ شخص جدید</b></summary><input id="nn" placeholder="نام"><input id="nj" placeholder="کار"><select id="ncb"><option value="1">👷 دستیار</option><option value="">🤝 شخص عادی (قرض)</option></select><input id="npc" type="number" min="0" max="100" placeholder="درصد سهم"><button id="nadd">افزودن</button></details>`;
  return `${addP}${names.sort((a, b) => Math.abs(combined(b)) - Math.abs(combined(a))).map(p => { const co = CO[p] !== undefined, w = wage(p), l = loan(p), Lp = L.filter(t => t.person === p); return `<details class="card"><summary class="row"><div><b>${esc(p)}${co ? ' (' + Number(CO[p]).toLocaleString('fa-IR') + '٪)' : ''}</b><div class="mut">${esc(PJ[p] || '')}${co ? ' · دستیار' : ''}</div></div></summary><div style="margin-top:10px;line-height:2;font-size:14px">${co ? `<div>دستمزد: <b class="${w < 0 ? 'red' : 'grn'}">${balanceText(w, 'wage')}</b></div>` : ''}<div>قرض: <b class="${l < 0 ? 'red' : 'grn'}">${balanceText(l, 'loan')}</b></div><span class="mut">تعداد ردیف: ${Lp.length.toLocaleString('fa-IR')}</span></div><button class="lp" data-p="${esc(p)}" style="width:100%;margin-top:8px">حساب کامل ‹</button></details>`; }).join('') || '<div class="card mut">هنوز شخصی ثبت نشده.</div>'}`;
}
function rowHtml(t, statusMap) {
  if (editing.has(String(t.id))) return pendingCard(t);
  const work = statusMap instanceof Map ? statusMap.get(String(t.id)) : null;
  return `<div class="card" data-id="${t.id}"><div class="row"><b>${t.xfer ? '🔁 ' : ''}${t.loan ? '🤝 ' + esc(t.person) : esc(t.desc || '—')}${work && work.left === 0 ? ' <span class="grn" title="پرداخت‌شده">✓</span>' : ''}${!t.loan && t.seller ? ' <span class="mut">· ' + esc(t.seller) + '</span>' : ''}</b><b class="${t.xfer || t.loan === 'share' ? 'mut' : t.loan ? (LOAN[t.loan][1] > 0 ? 'grn' : 'red') : t.type === 'debit' ? 'red' : 'grn'}">${t.ghost && !t.manualBalance && t.loan !== 'share' ? '' : (t.loan ? (LOAN[t.loan][1] > 0 ? '+' : '−') : t.type === 'debit' ? '−' : '+') + toman(t.amount)}</b></div>
  ${t.loan ? `<div class="mut" style="margin-top:6px">${esc(LOAN[t.loan][0])}${t.desc && !t.desc.includes(LOAN[t.loan][0]) && !LOAN[t.loan][0].includes(t.desc) ? ' · ' + esc(t.desc) : ''}</div>` : ''}
  <div class="row" style="margin-top:6px"><span>${badge(t.account)}</span><span class="mut">${esc(t.cat)} · ${esc(t.date)}${t.loan && !t.ghost ? ' · ' + esc(((t.receipt || '').match(/\d{1,2}:\d{2}(:\d{2})?/) || [new Date(t.id).toTimeString().slice(0, 8)])[0]) : ''}</span></div>
  ${featureOn('invoice') && (t.customer || t.service) ? `<div class="mut" style="margin-top:6px">${t.customer ? esc(t.customer) + ' <span class="mut">(' + esc(t.ctype === 'driver' ? 'راننده' : t.ctype === 'normal' || !t.ctype ? 'مشتری' : t.ctype) + ')</span>' : ''}${t.customer && t.service ? ' · ' : ''}${t.service ? 'خدمت: ' + esc(t.service) : ''}</div>` : ''}
  ${featureOn('assistant') && t.colleague && t.shareAmount ? `<div class="mut">دستیار / همکار: ${esc(t.colleague)} · ${t.shareMode === 'fixed' ? 'مبلغ ثابت' : Number(t.pct).toLocaleString('fa-IR') + '٪'} · سهم ${toman(t.shareAmount)} تومان</div>` : ''}
  <div class="row" style="margin-top:6px">${t.ghost && !t.parent ? `<button class="sec wdel" data-id="${t.id}">🗑 حذف</button>` : '<button class="sec ed">ویرایش</button>'}${tab === 'contacts' && lp && t.loan ? `<button type="button" class="sec workreview" data-id="${t.id}">مرور</button>` : ''}${!t.ghost && t.type === 'debit' && (t.receipt || t.loan) ? `<details class="rcpbox"><summary class="mut">🧾 رسید بانکی${t.receipt ? '' : ' (ندارد)'}</summary>${t.receipt ? `<div style="font-size:13px;white-space:pre-wrap;margin:6px 0">${esc(t.receipt)}</div><button class="sec rcpdel" data-id="${t.id}" style="color:#c0392b">🗑 حذف رسید</button>` : `<textarea class="rcpin" rows="3" placeholder="متن پیامک رسید بانک را اینجا بچسبان"></textarea><button class="rcpadd" data-id="${t.id}">چسباندن پیامک رسید</button>`}</details>` : ''}${t.raw ? `<details><summary class="mut">متن پیامک</summary><div style="font-size:13px;white-space:pre-wrap">${esc(t.raw)}</div></details>` : ''}</div></div>`;
}
function homeHtml() {
  return (featureOn('reminder') ? dueBanner157() + remBanner() : '') + homeHtml0();
}
function homeHtml0() {
  const bal = {};
  [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(t => { if (t.balance != null && !(t.account in bal)) bal[t.account] = t.balance; });
  const accs = Object.keys(bal).filter(isSel);
  const total = accs.reduce((s, a) => s + bal[a], 0);
  const cur = tx.map(monthOf).sort().pop();
  const mt = tx.filter(t => isSel(t.account) && !t.xfer && !t.loan && monthOf(t) === cur);
  const spent = mt.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const got = mt.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const pend = tx.filter(t => t.pending);
  return `${banner ? `<div class="card">${banner}</div>` : ''}
  ${xsugHtml()}
  ${featureOn('sms') ? rcReviewHtml() : ''}
  ${pend.length ? `<h3>منتظر توضیح (${pend.length.toLocaleString('fa-IR')})</h3>` + pend.map(pendingCard).join('') : ''}
  ${filterBar()}
  ${statusCard()}
  <div class="hero"><div style="opacity:.8">${!sel || sel.length > 1 ? 'مجموع موجودی' : 'موجودی'}</div><div class="big">${toman(total)} <small>تومان</small></div>
    ${cur ? `<div class="row" style="margin-top:12px"><span>هزینهٔ ${esc(cur)}: <b>${toman(spent)}</b></span><span>واریز: <b>${toman(got)}</b></span></div>` : ''}</div>
  ${accs.length > 1 || sel ? accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('') : accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('')}
  ${!accs.length ? '<div class="card mut">هنوز تراکنشی نیست.</div>' : ''}
  <h3>آخرین‌ها</h3>${ordBar()}${ordTx(tx.filter(t => !t.pending && !t.ghost && isSel(t.account))).slice(0, 15).map(rowHtml).join('') || '<div class="mut">—</div>'}`;
}
function jd(d) {
  const p = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d);
  const g = t => String(p.find(x => x.type === t).value).padStart(2, '0');
  return g('year') + '/' + g('month') + '/' + g('day');
}
function trendHtml() {
  const real = tx.filter(t => isSel(t.account) && !t.xfer && !t.loan && !t.pending);
  const sumD = (f, ty) => real.filter(t => t.type === ty && f(t.date.slice(0, 10))).reduce((s, t) => s + t.amount, 0);
  const now = new Date(), DAY = 864e5;
  const names = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(now - i * DAY), k = jd(d); days.push({ k, n: names[(d.getDay() + 1) % 7], o: sumD(x => x === k, 'debit'), i: sumD(x => x === k, 'credit') }); }
  const off = (now.getDay() + 1) % 7;
  const wk = (a, b) => { const set = new Set(); for (let i = a; i <= b; i++) set.add(jd(new Date(now - i * DAY))); return { o: sumD(x => set.has(x), 'debit'), i: sumD(x => set.has(x), 'credit') }; };
  const cur = wk(0, off), prev = wk(off + 1, off + 7);
  const ms = []; const seen = new Set();
  for (let i = 0; i < 400 && ms.length < 12; i++) { const m = jd(new Date(now - i * 30.4 * DAY)).slice(0, 7); if (!seen.has(m)) { seen.add(m); ms.push(m); } }
  const mrows = ms.map(m => ({ m, o: sumD(x => x.slice(0, 7) === m, 'debit'), i: sumD(x => x.slice(0, 7) === m, 'credit') }));
  const mx = Math.max(1, ...days.map(d => d.o), ...mrows.map(r => r.o));
  const bar = v => `<div style="height:6px;border-radius:3px;background:#e5e7eb;margin-top:3px"><div style="height:6px;border-radius:3px;background:#dc2626;width:${Math.round(v / mx * 100)}%"></div></div>`;
  const line = (l, o, i) => `<div style="margin-top:8px"><div class="row"><span>${l}</span><span><b class="red">${toman(o)}</b> · <b class="grn">${toman(i)}</b></span></div>${bar(o)}</div>`;
  return `<details class="card"><summary><b>۷ روز اخیر</b></summary><div class="mut">قرمز: خرج · سبز: درآمد</div>${days.map(d => line(d.n + ' ' + d.k.slice(5), d.o, d.i)).join('')}</details>
  <details class="card"><summary><b>هفته (شنبه تا جمعه)</b></summary>
    <div class="row" style="margin-top:8px"><span>هفته جاری تا الان</span><span><b class="red">${toman(cur.o)}</b> · <b class="grn">${toman(cur.i)}</b></span></div>
    <div class="row" style="margin-top:8px"><span>هفته قبل</span><span><b class="red">${toman(prev.o)}</b> · <b class="grn">${toman(prev.i)}</b></span></div></details>
  <details class="card"><summary><b>ماهانه (یک سال اخیر)</b></summary>${mrows.map(r => line(r.m, r.o, r.i)).join('')}</details>`;
}
function driversHtml() {
  const d = tx.filter(t => !t.pending && !t.ghost && t.type === 'credit' && t.customer && t.ctype === 'driver');
  if (!d.length) return '';
  const ym = month ? String(month).slice(0, 7) : '', yr = ym.slice(0, 4), m = {};
  d.forEach(t => { const r = m[t.customer] || (m[t.customer] = { mo: 0, yr: 0, all: 0, n: 0, ph: '' }); const dt = t.date || ''; r.all += t.amount; r.n++; if (dt.startsWith(yr)) r.yr += t.amount; if (dt.startsWith(ym)) r.mo += t.amount; if (t.cphone) r.ph = t.cphone; });
  const rows = Object.entries(m).sort((a, b) => b[1].yr - a[1].yr);
  return `<details class="card"><summary><b>🚚 رانندگان (مشتری‌های خدماتی)</b></summary><div class="mut">مرتب بر اساس واریزی امسال؛ ماه و سال از ماه انتخاب‌شده</div>${rows.map(([n, r], i) => `<div style="margin-top:10px"><div class="row"><b>${i + 1}. ${esc(n)}</b>${r.ph ? `<a href="tel:${esc(r.ph)}">${esc(r.ph)}</a>` : ''}</div><div class="row mut"><span>این ماه: <b class="grn">${toman(r.mo)}</b></span><span>امسال: <b class="grn">${toman(r.yr)}</b></span></div><div class="mut">کل: ${toman(r.all)} · ${r.n.toLocaleString('fa-IR')} بار</div></div>`).join('')}</details>`;
}
function reportHtml() {
  const base = tx.filter(t => isSel(t.account));
  const months = [...new Set(tx.map(monthOf))].sort().reverse();
  if (!month || !months.includes(month)) month = months[0];
  const list = base.filter(t => monthOf(t) === month);
  const real = list.filter(t => !t.xfer && !t.loan);
  const loans = {}; tx.filter(t => t.loan && !isWage(t) && isSel(t.account)).forEach(t => loans[t.person] = (loans[t.person] || 0) + LOAN[t.loan][1] * t.amount);
  const days = new Set(real.filter(t => t.type === 'debit').map(t => t.date.slice(0, 10))).size || 1;
  const topD = Object.entries(real.filter(t => t.type === 'debit' && t.desc).reduce((m, t) => (m[t.desc] = (m[t.desc] || 0) + t.amount, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const out = real.filter(t => t.type === 'debit'), inn = real.filter(t => t.type === 'credit');
  const flows = {}; list.filter(t => t.xfer && t.type === 'debit').forEach(t => { const k = t.account + '>' + t.to; const f = flows[k] || (flows[k] = { v: 0, n: 0, fee: 0 }); f.v += t.amount; f.n++; f.fee += t.fee || 0; });
  const sum = a => a.reduce((s, t) => s + t.amount, 0);
  const by = (arr, f) => { const m = {}; arr.forEach(t => m[f(t)] = (m[f(t)] || 0) + t.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cats = by(out, t => t.cat || 'بدون دسته');
  const incBy = { cu: by(inn.filter(t => t.customer), t => t.customer), sv: by(inn.filter(t => t.service), t => t.service) };
  const tot = sum(out) || 1, mx = cats[0]?.[1] || 1;
  const accRows = allAccs().filter(isSel).map(a => {
    const l = list.filter(t => t.account === a && !t.ghost);
    return { a, o: sum(l.filter(t => t.type === 'debit' && !t.xfer)), i: sum(l.filter(t => t.type === 'credit' && !t.xfer)), xo: sum(l.filter(t => t.type === 'debit' && t.xfer)), xi: sum(l.filter(t => t.type === 'credit' && t.xfer)) };
  }).filter(r => r.o || r.i || r.xo || r.xi);
  if (!months.length) return filterBar() + invoiceLedgerHtml() + '<div class="card mut">تراکنشی نیست.</div>';
  return `${filterBar()}${invoiceLedgerHtml()}${nameSugHtml()}
  <select id="m">${months.map(m => `<option ${m === month ? 'selected' : ''}>${m}</option>`).join('')}</select>
  <div class="hero"><div style="opacity:.8">خرج این ماه</div><div class="big">${toman(sum(out))} <small>تومان</small></div>
    <div class="row" style="margin-top:12px"><span>واریز: <b>${toman(sum(inn))}</b></span><span>مانده: <b>${toman(sum(inn) - sum(out))}</b><div style="font-size:11px;opacity:.75">درآمد منهای خرج</div></span></div></div>
  ${trendHtml()}
  <details class="card"><summary><b>میانگین خرج روزانه</b></summary><div>${toman(Math.round(sum(out) / days))} تومان <span class="mut">(${days.toLocaleString('fa-IR')} روز دارای خرج)</span></div></details>
  ${topD.length ? `<details class="card"><summary><b>بیشترین خرج‌ها</b></summary>${topD.map(([d, v]) => `<div class="row" style="margin-top:6px"><span>${esc(d)}</span><span>${toman(v)}</span></div>`).join('')}</details>` : ''}
  ${featureOn('loan') && Object.keys(loans).length ? `<details class="card"><summary><b>🤝 قرض‌ها (کل زمان)</b></summary>${Object.entries(loans).map(([p, v]) => `<div class="row" style="margin-top:8px"><span>${esc(p)}</span><b class="${v > 0 ? 'grn' : v < 0 ? 'red' : 'mut'}">${v > 0 ? 'بدهکار به من: ' : v < 0 ? 'من بدهکارم: ' : 'تسویه '}${v ? toman(Math.abs(v)) : ''}</b></div>`).join('')}</details>` : ''}
  <details class="card"><summary><b>خرج به تفکیک دسته</b></summary>${cats.map(([c, v]) => `<div style="margin-top:10px"><div class="row"><span>${esc(c)}</span><span>${toman(v)} <span class="mut">(${Math.round(v / tot * 100).toLocaleString('fa-IR')}٪)</span></span></div><div class="bar" style="width:${v / mx * 100}%"></div></div>`).join('') || '<div class="mut">خرجی نیست</div>'}</details>
  <details class="card"><summary><b>به تفکیک حساب</b></summary>${accRows.map(r => `<div style="margin-top:10px"><div>${badge(r.a)}</div><div class="row mut"><span>خرج: <b class="red">${toman(r.o)}</b></span><span>واریز: <b class="grn">${toman(r.i)}</b></span></div>${r.xo || r.xi ? `<div class="row mut"><span>انتقال رفته: ${toman(r.xo)}</span><span>انتقال آمده: ${toman(r.xi)}</span></div>` : ''}</div>`).join('') || '<div class="mut">—</div>'}</details>
  ${Object.keys(flows).length ? `<details class="card"><summary><b>جابه‌جایی بین حساب‌هایم 🔁</b></summary><div class="mut">در مجموع خرج یا درآمد حساب نمی‌شود.</div>${Object.entries(flows).map(([k, v]) => { const [f, t] = k.split('>'); return `<div class="row" style="margin-top:8px"><span>${badge(f)} ← ${badge(t)}</span><b>${toman(v.v)} تومان</b></div><div class="mut">${v.n.toLocaleString('fa-IR')} بار${v.fee ? ' · کارمزد ' + toman(v.fee) : ''}</div>`; }).join('')}</details>` : ''}
  ${featureOn('invoice') && featureOn('vehicle') ? driversHtml() : ''}
  ${incBy.cu.length ? `<details class="card"${featureOn('invoice') ? '' : ' hidden'}><summary><b>💰 درآمد به تفکیک مشتری</b></summary>${incBy.cu.map(([c, v]) => `<div class="row" style="margin-top:6px"><span>${esc(c)}</span><b class="grn">${toman(v)}</b></div>`).join('')}</details>` : ''}
  ${incBy.sv.length ? `<details class="card"${featureOn('invoice') ? '' : ' hidden'}><summary><b>🔧 درآمد به تفکیک خدمت</b></summary>${incBy.sv.map(([c, v]) => `<div class="row" style="margin-top:6px"><span>${esc(c)}</span><b class="grn">${toman(v)}</b></div>`).join('')}</details>` : ''}
  <details class="card"${featureOn('invoice') ? '' : ' hidden'}><summary><b>🔍 جستجوی مشتری / خدمت</b></summary><input id="cq" placeholder="نام مشتری، خدمت یا شرح..."><div id="cqr"></div></details>
  <h3>تراکنش‌ها</h3>${ordBar()}${ordTx(list).map(rowHtml).join('')}`;
}

document.addEventListener('change', e => {
  if (e.target.classList.contains('sharemode')) { const card = e.target.closest('.card'); (drafts[card.dataset.id] = drafts[card.dataset.id] || {}).shareMode = e.target.value; colRefresh(card); return; }
  if (!e.target.classList.contains('co')) return;
  const card = e.target.closest('.card'), v = e.target.value, c = cols();
  (drafts[card.dataset.id] = drafts[card.dataset.id] || {}).co = v;
  card.querySelector('.cn').classList.toggle('hide', v !== '__new');
  card.querySelector('.pv').dataset.v = v && c[v] !== undefined ? c[v] : card.querySelector('.pv').dataset.v;
  drafts[card.dataset.id].pc = Number(card.querySelector('.pv').dataset.v);
  colRefresh(card);
});
document.addEventListener('input', e => { if (e.target.matches('#wa,#manualamount,#ma,#ra,.sharefixed')) invoiceAmountInput(e.target); if (e.target.classList.contains('sharefixed')) { const card = e.target.closest('.card'); (drafts[card.dataset.id] = drafts[card.dataset.id] || {}).shareAmount = e.target.value; colRefresh(card); } });
let _ht, _hi;
function pstep(b, k) { const card = b.closest('.card'), v = card.querySelector('.pv'); v.dataset.v = Math.max(0, Math.min(100, Number(v.dataset.v) + b.dataset.d * k)); (drafts[card.dataset.id] = drafts[card.dataset.id] || {}).pc = Number(v.dataset.v); colRefresh(card); }
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.pa'); if (!b) return;
  b._held = false; _ht = setTimeout(() => { b._held = true; pstep(b, 5); _hi = setInterval(() => pstep(b, 5), 250); }, 450);
  b.addEventListener('pointerup', () => { clearTimeout(_ht); clearInterval(_hi); if (!b._held) pstep(b, 1); }, { once: true });
  b.addEventListener('pointerleave', () => { clearTimeout(_ht); clearInterval(_hi); b._held = true; }, { once: true });
});
document.addEventListener('change', e => {
  if (e.target.id !== 'combinebalances') return;
  showAssistantTotal = e.target.checked;
  const row = document.querySelector('.combinedbalance'); if (row) row.hidden = !showAssistantTotal;
});
document.addEventListener('click', async e => {
  const workDay = e.target.closest('.work-day'); if (workDay) { const date = document.getElementById(workDay.dataset.target); if (date) { date.value = invoiceDate(Number(workDay.dataset.days)); syncPersianDate(date); date.dispatchEvent(new Event('input', { bubbles:true })); } return; }
  const review = e.target.closest('.workreview');
  if (review) {
    const t = tx.find(x => String(x.id) === review.dataset.id), box = $('#workreviewbox'); if (!t || !box) return;
    const parent = t.parent ? tx.find(x => x.id === t.parent) : null, source = parent || t;
    const fields = [ ['نوع', LOAN[t.loan]?.[0]], ['شخص', t.person], ['مبلغ این ردیف', toman(t.amount) + ' تومان'], ['تاریخ', t.date], ['شرح', t.desc], ['حساب', source.account ? accName(source.account) : ''], ['مبلغ واریزی اصلی', parent ? toman(parent.amount) + ' تومان' : ''], ['مشتری', source.customer], ['خدمت', source.service], ['سهم', parent ? (parent.shareMode === 'fixed' ? 'مبلغ ثابت' : parent.pct ? parent.pct + '٪' : '') : ''] ].filter(([,v]) => v);
    box.innerHTML = `<div class="card"><div class="row"><b>🔎 مرور جزئیات</b><button type="button" class="sec reviewclose">بستن</button></div>${fields.map(([k,v]) => `<div style="margin-top:6px"><span class="mut">${esc(k)}: </span><b>${esc(v)}</b></div>`).join('')}${source.raw ? `<details style="margin-top:8px"><summary class="mut">متن پیامک</summary><div style="white-space:pre-wrap">${esc(source.raw)}</div></details>` : ''}${source.receipt ? `<details style="margin-top:8px"><summary class="mut">رسید بانکی</summary><div style="white-space:pre-wrap">${esc(source.receipt)}</div></details>` : ''}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
  }
  if (e.target.closest('.reviewclose')) { const box = $('#workreviewbox'); if (box) box.innerHTML = ''; return; }
  if (e.target.id === 'manualsave') {
    if (!lp) return;
    const kind = $('#manualkind').value, amount = (invoiceDigits($('#manualamount').value) || 0) * 10;
    const dt = $('#manualdate').value.trim().replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[-.]/g, '/');
    const m = dt.match(/^(1[34]\d{2})\/(\d{1,2})\/(\d{1,2})$/);
    if (!['share', 'wage', 'lent', 'borrowed'].includes(kind) || ((kind === 'share' || kind === 'wage') && cols()[lp] === undefined)) { alert('نوع حساب را انتخاب کن'); return; }
    if (!Number.isSafeInteger(amount) || amount <= 0) { alert('مبلغ معتبر به تومان وارد کن'); return; }
    if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > (+m[2] <= 6 ? 31 : 30)) { alert('تاریخ شمسی معتبر وارد کن'); return; }
    const date = `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')} ${nowStr().slice(11)}`;
    const b = tx.find(x => x.account) || {}, desc = $('#manualdesc').value.trim() || 'مانده حساب از قبل';
    tx.push({ id: Date.now() + Math.random(), ghost: true, manualBalance: true, bank: b.bank || '', account: b.account || '', type: LOAN[kind][1] > 0 ? 'debit' : 'credit', amount, balance: null, date, cat: lcat(kind), loan: kind, person: lp, desc, pending: false });
    save(); render(); return;
  }
  if (e.target.id === 'wadd') { const a = invoiceDigits($('#wa').value), d = $('#wd').value.trim(); if (!a || !lp || !Number.isSafeInteger(a * 10)) { alert('مبلغ معتبر به تومان وارد کن'); return; } const b = tx.find(x => x.account) || {}; let dt = ($('#wdt').value || '').trim().replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[-.]/g, '/'); const nw = nowStr(), m = dt.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (dt && (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > (+m[2] <= 6 ? 31 : 30))) { alert('تاریخ شمسی معتبر وارد کن'); return; } const wdate = m ? `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')} ${nw.slice(11)}` : nw; tx.push({ id: Date.now(), ghost: true, bank: b.bank, account: b.account, type: 'credit', amount: a * 10, balance: null, date: wdate, cat: 'کارکرد همکار', loan: 'share', person: lp, desc: d || 'کارکرد', pending: false }); save(); render(); return; }
  if (e.target.classList.contains('wdel')) { if (confirm('این ردیف حذف شود؟ مطمئنی؟')) { tomb([e.target.dataset.id]); tx = tx.filter(x => x.id !== Number(e.target.dataset.id)); save(); render(); } return; }
  if (e.target.id === 'pdel') { if (confirm('«' + lp + '» و همهٔ ردیف‌های حساب او حذف شود؟')) { const c = cols(), j = pjobs(); delete c[lp]; delete j[lp]; setCols(c); localStorage.setItem('pjobs', JSON.stringify(j)); tx.forEach(x => { if (x.colleague === lp) { x.colleague = ''; x.pct = 0; } }); tomb(tx.filter(x => x.person === lp).map(x => x.id)); tx = tx.filter(x => x.person !== lp); lp = null; save(); render(); } return; }
  const cpb = e.target.closest('button.cp'); if (cpb) { const cd = cpb.closest('.card'), pi = cd.querySelector('.p'); pi.value = cpb.dataset.n; (drafts[cd.dataset.id] = drafts[cd.dataset.id] || {}).p = pi.value; balHint(cd); return; }
  if (e.target.id === 'nadd' || (e.target.id === 'psv' && $('#pcb'))) {
    const nw = e.target.id === 'nadd', nm = nw ? $('#nn').value.trim() : lp; if (!nm) return;
    const jb = $(nw ? '#nj' : '#pj').value.trim(), on = !!$(nw ? '#ncb' : '#pcb').value, pc = Math.max(0, Math.min(100, Number($(nw ? '#npc' : '#ppc').value) || 0));
    const c = cols(), j = pjobs(); if (!nw && (jb !== (j[nm] || '') || on !== (c[nm] !== undefined) || (on && pc !== Number(c[nm] || 0))) && !confirm('مشخصات دستیار تغییر کرده است. تغییرات ذخیره شود؟')) return; if (jb) j[nm] = jb; else delete j[nm]; if (on) c[nm] = pc; else delete c[nm];
    setCols(c); localStorage.setItem('pjobs', JSON.stringify(j)); localStorage.setItem('dirty', '1'); push(); if (nw) lp = nm; render(); return;
  }
  const rb = e.target.closest('.rdn'); if (rb && topic !== 'reminders' && tab !== 'rem') { const r = rem.find(x => x.id == rb.dataset.i); if (r) { r.done = !r.done; saveRem(); render(); } return; }
  const lpc = e.target.closest('.lp'); if (lpc) { lp = lpc.dataset.p; showAssistantTotal = false; render(); return; }
  if (e.target.id === 'pdfb') { $('#pdfchoices')?.classList.toggle('hide'); return; }
  if (e.target.id === 'pdfcancel') { $('#pdfchoices')?.classList.add('hide'); return; }
  if (e.target.id === 'pdftable' || e.target.id === 'pdflinear') { pdfPerson(lp, e.target.id === 'pdflinear' ? 'linear' : 'table'); return; }
  if (e.target.id === 'lb') { lp = null; render(); return; }
  const ob = e.target.closest('.ordb'); if (ob) { ord = ob.dataset.o; localStorage.setItem('ord', ord); render(); return; }
  const invoiceOpen = e.target.closest('.invoice-open-list'); if (invoiceOpen) { const filter = invoiceOpen.dataset.filter || 'all'; if (topic !== 'sales') topic = 'invoices'; tab = 'report'; render(); const card = document.getElementById('invoice-card'); document.getElementById('inv-filter').value = filter; invoiceShowList(''); card.scrollIntoView({ behavior:'smooth', block:'start' }); return; }
  if (e.target.id === 'welcome-later') { welcomeDismissed = true; const card = document.getElementById('welcome-sync'); if (card) card.hidden = true; return; }
  if (e.target.id === 'welcome-google' && !(load('directSyncState', null)?.id && load('directSyncState', null)?.base && load('directSyncState', null)?.email)) { const group = document.getElementById('settings-advanced'), card = document.getElementById('easy-setup'); if (group && card) { group.open = true; card.open = true; card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (e.target.id === 'welcome-google' || e.target.id === 'home-direct-start') { if (!window.google?.accounts?.oauth2) { prepareGoogleTest(); directAutoShow('سرویس گوگل در حال آماده‌شدن است؛ چند لحظه بعد دوباره دکمه را بزن.'); return; } directAutoStart(e.target.id === 'welcome-google'); return; }
  if (e.target.id === 'gs') { const u = localStorage.getItem('sheetUrl'); if (u) window.open(u, '_blank'); else alert('هنوز آدرس شیت دریافت نشده. اول «ذخیره و همگام‌سازی» را بزن (و Code.gs نسخهٔ جدید را Deploy کن).'); return; }
  if (e.target.id === 'clip') {
    try { const t = await navigator.clipboard.readText(); const r = addSms(t); banner = r.ok ? '✅ ثبت شد' : '⚠️ ' + r.msg; } catch { banner = '⚠️ دسترسی به کلیپ‌بورد نشد؛ از تب افزودن Paste کن.'; }
    render(); return;
  }
  const fa = e.target.closest('.fb [data-a]');
  if (fa) { const a = fa.dataset.a; if (a === '*') sel = null; else { sel = sel ? (sel.includes(a) ? sel.filter(x => x !== a) : [...sel, a]) : [a]; if (!sel.length) sel = null; } localStorage.setItem('sel', JSON.stringify(sel)); render(); return; }
  const topicButton = e.target.closest('[data-topic]'); if (topicButton) { topic = topicButton.dataset.topic; if (tab === 'contacts' || tab === 'settings') tab = 'home'; lp = null; render(); window.scrollTo(0, 0); return; }
  const nb = e.target.closest('nav button'); if (nb) { tab = nb.dataset.t; lp = null; render(); window.scrollTo(0, 0); return; }
  const card = e.target.closest('.card[data-id]'); if (!card) return;
  const id = +card.dataset.id;
  if (e.target.classList.contains('ok')) { const input = card.querySelector('.rdtPersian'); if (input) { const date = input.value.trim(); const iso = date ? persianToIso(date) : ''; if (date && !iso) { alert('تاریخ یادآوری معتبر نیست'); return; } card.querySelector('.rdt').value = iso; } }
  if (e.target.classList.contains('ok') && editing.has(String(id))) { const old = editSnapshots[id]; if (old === editSignature(card)) { editing.delete(String(id)); delete editSnapshots[id]; delete drafts[id]; render(); return; } if (!confirm('اطلاعات تراکنش تغییر کرده است. تغییرات ذخیره شود؟')) return; }
  if (e.target.classList.contains('ln') && editing.has(String(id)) && !confirm('نوع تراکنش تغییر می‌کند. تغییرات ذخیره شود؟')) return;
  if (e.target.matches('.cx,.xf,.skip')) { delete drafts[id]; editing.delete(String(id)); delete editSnapshots[id]; }
  if (e.target.classList.contains('sqn')) { const i = card.querySelector('.sv'); i.value = e.target.dataset.n; (drafts[id] = drafts[id] || {}).sv = i.value; return; }
  if (e.target.classList.contains('cqn')) { const i = card.querySelector('.cu'); i.value = e.target.dataset.n; i.dispatchEvent(new Event('input', { bubbles: true })); (drafts[id] = drafts[id] || {}).cu = i.value; return; }
  if (e.target.classList.contains('ctb')) { const b = card.querySelector('.ctbox'), v = e.target.dataset.v; b.dataset.ct = b.dataset.ct === v ? '' : v; b.querySelectorAll('.ctb').forEach(x => x.classList.toggle('on', x.dataset.v === b.dataset.ct)); (drafts[id] = drafts[id] || {}).ct = b.dataset.ct; return; }
  if (e.target.dataset.c) { const cb = card.querySelector('.ctbox'); if (cb) cb.classList.toggle('hide', e.target.dataset.c === 'فروش'); (drafts[id] = drafts[id] || {}).cat = e.target.dataset.c; card.dataset.cat = e.target.dataset.c; card.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === e.target)); const seen = new Set(); card.querySelector('datalist').innerHTML = [...tx].reverse().filter(x => x.cat === e.target.dataset.c && x.desc && !seen.has(x.desc) && seen.add(x.desc)).slice(0, 15).map(x => `<option value="${esc(x.desc)}">`).join(''); }
  if (e.target.classList.contains('ed')) { const t = tx.find(x => x.id === id); editing.add(String(id)); card.outerHTML = pendingCard(t); const fresh = document.querySelector('.card[data-id="' + id + '"]'); if (fresh) { colRefresh(fresh); balHint(fresh); editSnapshots[id] = editSignature(fresh); } return; }
  const lkS = card.querySelector('.lk'); if (e.target.classList.contains('ok') && lkS && lkS.value && !card.querySelector('.p').value.trim()) { alert('اول نام شخص/همکار را انتخاب کن'); return; }
  if (e.target.classList.contains('ln') || (e.target.classList.contains('ok') && lkS && lkS.value)) { const p = card.querySelector('.p').value.trim(); if (!p) { alert('نام شخص را بنویس'); return; } const t = tx.find(x => x.id === id), k = e.target.classList.contains('ln') ? e.target.dataset.k : lkS.value; t.loan = k; t.person = p; t.seller = ''; t.cat = lcat(k); { const dv = card.querySelector('.d').value.trim(); t.desc = Object.values(LOAN).some(x => x[0] === dv) ? '' : dv; } t.xfer = false; t.pending = false; delete drafts[id]; editing.delete(String(id)); delete editSnapshots[id]; save(); render(); return; }
  if (e.target.classList.contains('ok')) {
    const co = card.querySelector('.co'); let nm = '';
    if (co) {
      nm = co.value === '__new' ? card.querySelector('.cn').value.trim() : co.value;
      const pc = Number(card.querySelector('.pv').dataset.v) || 0, mode = card.querySelector('.sharemode').value;
      const fixedInput = card.querySelector('.sharefixed').value, fixed = (invoiceDigits(fixedInput) || 0) * 10;
      if (co.value === '__new' && !nm) { alert('نام دستیار / همکار را بنویس'); return; }
      if (nm && mode === 'fixed' && (!fixedInput || !Number.isSafeInteger(fixed) || fixed <= 0)) { alert('مبلغ سهم را به تومان وارد کن'); return; }
      if (nm && mode === 'percent' && (!Number.isFinite(pc) || pc <= 0 || pc > 100)) { alert('درصد سهم را بین ۱ و ۱۰۰ انتخاب کن'); return; }
      const tt = tx.find(x => x.id === id);
      if (nm && (mode === 'fixed' ? fixed : shareOf(tt.amount, pc)) > tt.amount) { alert('سهم نمی‌تواند بیشتر از مبلغ واریزی باشد'); return; }
      if (nm) { const c = cols(); if (c[nm] === undefined || (co.value === '__new' && mode === 'percent')) c[nm] = mode === 'percent' ? pc : 0; setCols(c); }
      if (featureOn('invoice')) { tt.customer = card.querySelector('.cu')?.value.trim() || ''; tt.service = card.querySelector('.sv')?.value.trim() || ''; tt.ctype = card.querySelector('.ctbox')?.dataset.ct || ''; }
      tt.desc = card.querySelector('.d').value.trim();
      applyShare(tt, nm, pc, mode, fixed);
    }
  }
  if (e.target.classList.contains('ok')) { const t0 = tx.find(x => x.id === id); if (t0 && t0.loan && !t0.ghost && t0.type === 'debit') { t0.seller = card.querySelector('.p').value.trim() || t0.seller || ''; t0.loan = ''; t0.person = ''; } }
  if (e.target.classList.contains('ok')) { const t0 = tx.find(x => x.id === id); if (t0 && t0.type === 'debit' && !t0.loan) t0.seller = card.querySelector('.p').value.trim(); }
  if (e.target.classList.contains('ok')) { const original = tx.find(x => x.id === id) || {}, keep = !featureOn('invoice'); delete drafts[id]; editing.delete(String(id)); delete editSnapshots[id]; setDesc(id, card.querySelector('.d').value.trim() || (card.querySelector('.catsel') ? card.dataset.cat : '') || card.querySelector('.d').value, card.dataset.cat, { preserveBiz: keep, customer: keep ? original.customer : card.querySelector('.cu')?.value.trim(), service: keep ? original.service : card.querySelector('.sv')?.value.trim(), ctype: keep ? original.ctype : card.querySelector('.ctbox')?.dataset.ct || '', cphone: keep ? original.cphone : card.querySelector('.cph')?.value.trim() || '', remDate: card.querySelector('.rdt').value }); }
  if (e.target.classList.contains('xf')) { const t = tx.find(x => x.id === id); t.xfer = true; t.cat = 'انتقال'; t.pending = false; t.desc = t.type === 'debit' ? 'انتقال به حساب دیگر' : 'انتقال از حساب دیگر'; save(); render(); return; }
  if (e.target.classList.contains('skip')) card.remove();
  if (e.target.classList.contains('cx')) { delete editSnapshots[id]; delete drafts[id]; editing.delete(String(id)); render(); return; }
  if (e.target.classList.contains('del')) { if (!confirm('این تراکنش حذف شود؟ مطمئنی؟')) return; const dt = tx.find(t => t.id === id); tomb(tx.filter(t => t.id === id || t.parent === id).map(t => t.id)); tx = tx.filter(t => t.id !== id && t.parent !== id); if (dt && dt.raw) { const g = JSON.parse(localStorage.getItem('logDel') || '[]'); log = log.filter(l => { const m = String(l.raw).trim() === String(dt.raw).trim(); if (m) g.push(l.at); return !m; }); localStorage.setItem('logDel', JSON.stringify(g)); saveLog(); } save(); render(); }
});

// آزمایش مستقل ورود به گوگل؛ هیچ توکنی ذخیره نمی‌شود و به شیت دسترسی ندارد.
const GOOGLE_TEST_CLIENT = '81248873609-pn4ggfnhpa7l69brm9lci9n1jldf7lhg.apps.googleusercontent.com';
let googleTestMessage = '', googleIdentityLoad = null, googleTestBusy = false, googleSheetMessage = '', googleWriteMessage = '', googleDataMessage = '', googleCopyMessage = '';
function googleCopyLink() {
  const copy = load('googleBackupCopy', null);
  if (!copy || !/^[a-zA-Z0-9_-]+$/.test(copy.id || '')) return '';
  return `<div style="margin-top:8px"><a href="https://docs.google.com/spreadsheets/d/${esc(copy.id)}/edit" target="_blank" rel="noopener noreferrer">باز کردن شیت پشتیبان</a>${copy.email ? ' <span class="mut">(' + esc(copy.email) + ')</span>' : ''}</div>`;
}
function googleCopyStatus(message) { googleCopyMessage = message; const el = document.getElementById('google-copy-msg'); if (el) el.textContent = message; }
function googleSheetLink() { const v = load('googleTestSheet', null); return v && /^[a-zA-Z0-9_-]+$/.test(v.id || '') ? `<div style="margin-top:8px"><a href="https://docs.google.com/spreadsheets/d/${esc(v.id)}/edit" target="_blank" rel="noopener noreferrer">باز کردن شیت آزمایشی</a>${v.email ? ' <span class="mut">(' + esc(v.email) + ')</span>' : ''}</div>` : ''; }
function googleDataStatus(message) { googleDataMessage = message; const el = document.getElementById('google-data-test-msg'); if (el) el.textContent = message; }
function googleWriteStatus(message) { googleWriteMessage = message; const el = document.getElementById('google-write-test-msg'); if (el) el.textContent = message; }
function googleSheetStatus(message) { googleSheetMessage = message; const el = document.getElementById('google-sheet-test-msg'); if (el) el.textContent = message; }
function googleTestStatus(message) {
  googleTestMessage = message;
  const el = document.getElementById('google-test-msg');
  if (el) el.textContent = message;
}
function googleTestButton() {
  const b = document.getElementById('google-test-btn');
  if (!b) return;
  const ready = !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  b.disabled = !ready || googleTestBusy;
  b.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'آزمایش ورود به گوگل' : 'در حال آماده‌سازی…';
  const sb = document.getElementById('google-sheet-test-btn'); if (sb) { sb.disabled = !ready || googleTestBusy; sb.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'ساخت شیت آزمایشی خالی' : 'در حال آماده‌سازی…'; }
  const wb = document.getElementById('google-write-test-btn'); if (wb) { wb.disabled = !ready || googleTestBusy; wb.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'آزمایش نوشتن و خواندن شیت' : 'در حال آماده‌سازی…'; }
  const db = document.getElementById('google-data-test-btn'); if (db) { db.disabled = !ready || googleTestBusy; db.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'آزمایش اطلاعات ساختگی' : 'در حال آماده‌سازی…'; }
  const cb = document.getElementById('google-copy-btn'); if (cb) { cb.disabled = !ready || googleTestBusy; cb.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'ساخت پشتیبان جدا در گوگل' : 'در حال آماده‌سازی…'; }
  const rb = document.getElementById('google-restore-btn'); if (rb) { rb.disabled = !ready || googleTestBusy; rb.textContent = googleTestBusy ? 'در حال بررسی…' : ready ? 'بررسی و دریافت پشتیبان گوگل' : 'در حال آماده‌سازی…'; }
}
function prepareGoogleTest() {
  if (!googleIdentityLoad) {
    googleIdentityLoad = new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
      script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('بارگذاری نشد')); };
      document.head.appendChild(script);
    });
  }
  googleIdentityLoad.then(() => {
    const b = document.getElementById('google-test-btn');
    if (!b) return;
    googleTestButton();
    const wb = document.getElementById('google-write-test-btn'); if (wb) wb.onclick = googleWriteTest;
    const db = document.getElementById('google-data-test-btn'); if (db) db.onclick = googleDataTest;
    const sb = document.getElementById('google-sheet-test-btn');
    if (sb) sb.onclick = () => {
      if (googleTestBusy) return;
      if (localStorage.getItem('googleTestSheetPending') && !confirm('ساخت قبلی ممکن است انجام شده باشد. ابتدا Google Drive را بررسی کن. باز هم شیت جدید ساخته شود؟')) return;
      if (load('googleTestSheet', null) && !confirm('یک شیت آزمایشی از قبل ساخته شده است. شیت خالی دیگری ساخته شود؟')) return;
      try {
        const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
          callback: async response => {
            let attempted = false;
            try {
              if (response.error || !response.access_token) throw new Error('اجازه دسترسی صادر نشد');
              const auth = { Authorization: 'Bearer ' + response.access_token };
              const userResponse = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: auth });
              if (!userResponse.ok) throw new Error('حساب گوگل مشخص نشد');
              const user = await userResponse.json(); accountOwnerIdentify(user.email); if (!user.email) throw new Error('ایمیل حساب دریافت نشد');
              googleSheetStatus('در حال ساخت شیت خالی برای ' + user.email + '…');
              localStorage.setItem('googleTestSheetPending', '1'); attempted = true;
              const created = await accountOwnerFetch('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { title: 'هزینه‌ها - شیت آزمایشی' } }) });
              if (!created.ok) { if (created.status < 500) { localStorage.removeItem('googleTestSheetPending'); attempted = false; } throw new Error('گوگل درخواست ساخت را نپذیرفت (کد ' + created.status + ')'); }
              const sheet = await created.json(); if (!sheet.spreadsheetId || !/^[a-zA-Z0-9_-]+$/.test(sheet.spreadsheetId)) throw new Error('شناسه شیت در پاسخ گوگل نبود');
              localStorage.setItem('googleTestSheet', JSON.stringify({ id: sheet.spreadsheetId, email: user.email }));
              localStorage.removeItem('googleTestSheetPending'); attempted = false;
              const check = await accountOwnerFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(sheet.spreadsheetId) + '?fields=spreadsheetId,properties.title', { headers: auth }).catch(() => null);
              googleSheetStatus(check && check.ok ? '✅ شیت خالی ساخته شد و دسترسی به آن بررسی شد. هیچ اطلاعاتی منتقل نشده است.' : '✅ شیت خالی ساخته شد؛ بررسی خودکار دسترسی کامل نشد. لینک زیر را بررسی کن.');
              const card = document.getElementById('google-test'); if (card) { const old = card.querySelector('.google-sheet-link'); if (old) old.remove(); const holder = document.createElement('div'); holder.className = 'google-sheet-link'; holder.innerHTML = googleSheetLink(); card.appendChild(holder); }
            } catch (err) { googleSheetStatus('⚠️ ' + (err.message || 'ساخت شیت بررسی نشد') + (attempted ? '؛ ممکن است شیت ساخته شده باشد. پیش از تلاش دوباره Google Drive را بررسی کن.' : '')); }
            finally { googleTestBusy = false; googleTestButton(); }
          },
          error_callback: () => { googleTestBusy = false; googleSheetStatus('⚠️ پنجره اجازه گوگل بسته شد یا باز نشد.'); googleTestButton(); }
        });
        googleTestBusy = true; googleSheetStatus('در حال باز کردن پنجره اجازه گوگل…'); googleTestButton();
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) { googleTestBusy = false; googleSheetStatus('⚠️ آماده‌سازی ناموفق بود: ' + (err.message || err)); googleTestButton(); }
    };
    b.onclick = () => {
      if (googleTestBusy) return;
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_TEST_CLIENT, scope: 'openid email',
          callback: async response => {
            try {
              if (response.error || !response.access_token) throw new Error('اجازه ورود صادر نشد');
              const r = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + response.access_token } });
              if (!r.ok) throw new Error('دریافت اطلاعات حساب ناموفق بود');
              const info = await r.json();
              accountOwnerIdentify(info.email);
              if (!info.email) throw new Error('ایمیل حساب دریافت نشد');
              googleTestStatus('✅ ورود آزمایشی موفق بود: ' + info.email + ' — اتصال شیت هنوز آماده نیست.');
            } catch (err) { googleTestStatus('⚠️ ' + (err.message || 'خطا در آزمایش ورود')); }
            finally { googleTestBusy = false; googleTestButton(); }
          },
          error_callback: () => { googleTestBusy = false; googleTestStatus('⚠️ پنجره ورود بسته شد یا باز نشد. دوباره تلاش کن.'); googleTestButton(); }
        });
        googleTestBusy = true; googleTestStatus('در حال باز کردن صفحه ورود گوگل…'); googleTestButton();
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) { googleTestBusy = false; googleTestStatus('⚠️ ورود آماده نشد: ' + (err.message || err)); googleTestButton(); }
    };
  }).catch(() => { googleIdentityLoad = null; googleTestStatus('⚠️ سرویس ورود گوگل بارگذاری نشد؛ اینترنت را بررسی کن و دوباره تنظیمات را باز کن.'); const b = document.getElementById('google-test-btn'); if (b) { b.disabled = true; b.textContent = 'سرویس در دسترس نیست'; } });
}

// فقط یک ردیف ساختگی به شیت آزمایشی افزوده می‌شود.
function googleWriteTest() {
  if (googleTestBusy) return;
  const sheet = load('googleTestSheet', null);
  if (!sheet || !/^[a-zA-Z0-9_-]+$/.test(sheet.id || '') || !sheet.email) { googleWriteStatus('⚠️ ابتدا در همین گوشی شیت آزمایشی را بساز.'); return; }
  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
      callback: async response => {
        let sent = false, written = false;
        try {
          if (response.error || !response.access_token) throw new Error('اجازه دسترسی صادر نشد');
          const auth = { Authorization: 'Bearer ' + response.access_token };
          const meRes = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: auth });
          if (!meRes.ok) throw new Error('حساب گوگل مشخص نشد');
          const me = await meRes.json();
          accountOwnerIdentify(me.email);
          if (!me.email || me.email.toLowerCase() !== sheet.email.toLowerCase()) throw new Error('حساب انتخاب‌شده با حساب سازنده شیت آزمایشی یکسان نیست');
          googleWriteStatus('در حال نوشتن و خواندن متن آزمایشی…');
          const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(sheet.id);
          const meta = await accountOwnerFetch(base + '?fields=sheets.properties.title', { headers: auth });
          if (!meta.ok) throw new Error('شیت آزمایشی در دسترس نیست (کد ' + meta.status + ')');
          const info = await meta.json(), title = info.sheets?.[0]?.properties?.title;
          if (!title) throw new Error('برگه‌ای در شیت آزمایشی پیدا نشد');
          const range = "'" + title.replace(/'/g, "''") + "'!A:B";
          const text = 'این یک آزمایش است؛ اطلاعات مالی نیست', id = 'آزمایش ' + Date.now();
          sent = true;
          const appended = await accountOwnerFetch(base + '/values/' + encodeURIComponent(range) + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ majorDimension: 'ROWS', values: [[id, text]] }) });
          if (!appended.ok) { if (appended.status < 500) sent = false; throw new Error('نوشتن در شیت انجام نشد (کد ' + appended.status + ')'); }
          written = true;
          const result = await appended.json(), updatedRange = result.updates?.updatedRange;
          if (!updatedRange) throw new Error('محدوده ردیف ثبت‌شده دریافت نشد');
          const read = await accountOwnerFetch(base + '/values/' + encodeURIComponent(updatedRange), { headers: auth });
          if (!read.ok) throw new Error('ردیف ثبت شد اما خواندن آن ناموفق بود (کد ' + read.status + ')');
          const values = (await read.json()).values;
          if (!values || !values[0] || values[0][0] !== id || values[0][1] !== text) throw new Error('متن خوانده‌شده با متن آزمایشی یکسان نبود');
          googleWriteStatus('✅ متن ساختگی نوشته و دوباره با موفقیت خوانده شد. اطلاعات مالی منتقل نشده است.');
        } catch (err) {
          const suffix = written ? ' ردیف ممکن است ثبت شده باشد؛ شیت آزمایشی را بررسی کن.' : sent ? ' ممکن است ردیف ثبت شده باشد؛ قبل از تکرار، شیت آزمایشی را بررسی کن.' : '';
          googleWriteStatus('⚠️ ' + (err.message || 'آزمایش ناموفق بود') + suffix);
        } finally { googleTestBusy = false; googleTestButton(); }
      },
      error_callback: () => { googleTestBusy = false; googleWriteStatus('⚠️ پنجره اجازه گوگل بسته شد یا باز نشد.'); googleTestButton(); }
    });
    googleTestBusy = true; googleWriteStatus('در حال باز کردن پنجره اجازه گوگل…'); googleTestButton();
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (err) { googleTestBusy = false; googleWriteStatus('⚠️ آماده‌سازی ناموفق بود: ' + (err.message || err)); googleTestButton(); }
}

// نمونه‌های ساختگی در برگه‌ای تازه و مجزا؛ داده‌های واقعی خوانده یا جابه‌جا نمی‌شوند.
function googleDataTest() {
  if (googleTestBusy) return;
  const sheet = load('googleTestSheet', null);
  if (!sheet || !/^[a-zA-Z0-9_-]+$/.test(sheet.id || '') || !sheet.email) { googleDataStatus('⚠️ ابتدا در همین گوشی شیت آزمایشی را بساز.'); return; }
  try {
    const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
      callback: async response => {
        let started = false, tabMade = false;
        const tabName = 'نمونه-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
        try {
          if (response.error || !response.access_token) throw new Error('اجازه دسترسی صادر نشد');
          const auth = { Authorization: 'Bearer ' + response.access_token };
          const userRes = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: auth });
          if (!userRes.ok) throw new Error('حساب گوگل مشخص نشد');
          const user = await userRes.json();
          accountOwnerIdentify(user.email);
          if (!user.email || user.email.toLowerCase() !== sheet.email.toLowerCase()) throw new Error('حساب انتخاب‌شده با حساب سازنده شیت یکسان نیست');
          const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(sheet.id);
          googleDataStatus('در حال ساخت برگه و ثبت اطلاعات ساختگی…');
          started = true;
          const create = await accountOwnerFetch(base + ':batchUpdate', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName, rightToLeft: true } } }] }) });
          if (!create.ok) { if (create.status < 500) started = false; throw new Error('ساخت برگه انجام نشد (کد ' + create.status + ')'); }
          tabMade = true;
          const records = [
            { type: 'تراکنش نمونه', data: { id: 'sample-income-1', type: 'credit', amount: 2500000, date: '1405/08/16 10:00', customer: 'مشتری نمونه', service: 'خدمت نمونه' } },
            { type: 'تراکنش نمونه', data: { id: 'sample-expense-1', type: 'debit', amount: 700000, date: '1405/08/16 11:00', seller: 'فروشنده نمونه', cat: 'خرید' } },
            { type: 'مخاطب نمونه', data: { id: 'sample-contact-1', name: 'مخاطب نمونه', phone: '09000000000', tags: ['راننده', 'مشتری'], cars: [{ model: 'اسکانیا', plate: 'نمونه' }] } }
          ];
          const rows = [['نوع', 'شناسه', 'اطلاعات ساختگی (مبلغ به ریال)'], ...records.map(r => [r.type, r.data.id, JSON.stringify(r.data)])];
          const range = "'" + tabName.replace(/'/g, "''") + "'!A1:C4";
          const write = await accountOwnerFetch(base + '/values/' + encodeURIComponent(range) + '?valueInputOption=RAW', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ majorDimension: 'ROWS', values: rows }) });
          if (!write.ok) throw new Error('ثبت نمونه‌ها ناموفق بود (کد ' + write.status + ')');
          const read = await accountOwnerFetch(base + '/values/' + encodeURIComponent(range), { headers: auth });
          if (!read.ok) throw new Error('خواندن نمونه‌ها ناموفق بود (کد ' + read.status + ')');
          const actual = (await read.json()).values;
          if (JSON.stringify(actual) !== JSON.stringify(rows)) throw new Error('اطلاعات بازخوانی‌شده با نمونه‌ها یکسان نیست');
          googleDataStatus('✅ دو تراکنش و یک مخاطب ساختگی در برگه «' + tabName + '» نوشته و یکسان خوانده شدند. اطلاعات واقعی منتقل نشده است.');
        } catch (err) {
          googleDataStatus('⚠️ ' + (err.message || 'آزمایش ناموفق بود') + (started ? ' ممکن است برگه «' + tabName + '» ' + 'ساخته شده باشد' + '؛ آن را در شیت آزمایشی بررسی کن.' : ''));
        } finally { googleTestBusy = false; googleTestButton(); }
      },
      error_callback: () => { googleTestBusy = false; googleDataStatus('⚠️ پنجره اجازه گوگل بسته شد یا باز نشد.'); googleTestButton(); }
    });
    googleTestBusy = true; googleDataStatus('در حال باز کردن پنجره اجازه گوگل…'); googleTestButton();
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (err) { googleTestBusy = false; googleDataStatus('⚠️ آماده‌سازی ناموفق بود: ' + (err.message || err)); googleTestButton(); }
}

function prepareGoogleCopy() {
  googleIdentityLoad.then(() => {
    const button = document.getElementById('google-copy-btn');
    if (button) button.onclick = googleCreateBackupCopy;
    const restore = document.getElementById('google-restore-btn');
    if (restore) restore.onclick = googleDownloadBackup;
    googleTestButton();
  }).catch(() => googleCopyStatus('⚠️ سرویس گوگل بارگذاری نشد؛ اینترنت را بررسی کن و تنظیمات را دوباره باز کن.'));
}
function googleBackupFromRows(rows) {
  if (!Array.isArray(rows) || !rows[0] || rows[0][0] !== 'format' || rows[0][1] !== 'expense-app-backup-v1' || !rows[1] || rows[1][0] !== 'chunks' || !/^[1-9]\d*$/.test(rows[1][1] || '')) throw new Error('این شیت پشتیبان معتبر برنامه نیست');
  const count = Number(rows[1][1]);
  if (!Number.isSafeInteger(count) || count > 100000 || rows.length !== count + 2) throw new Error('پشتیبان ناقص است');
  const parts = [];
  for (let index = 0; index < count; index++) {
    const row = rows[index + 2];
    if (!row || row[0] !== String(index + 1) || typeof row[1] !== 'string') throw new Error('بخش‌های پشتیبان ناقص یا نامرتب هستند');
    parts.push(row[1]);
  }
  const backup = JSON.parse(parts.join(''));
  validateFullBackup(backup);
  return backup;
}
function googleDownloadBackup() {
  if (googleTestBusy) return;
  const status = message => { const element = document.getElementById('google-restore-msg'); if (element) element.textContent = message; };
  const input = document.getElementById('google-restore-url').value.trim();
  let id = '';
  if (input) {
    try { const url = new URL(input); if (url.protocol === 'https:' && url.hostname === 'docs.google.com') id = (url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/) || [])[1] || ''; } catch { id = ''; }
  } else { const copy = load('googleBackupCopy', null); id = copy && copy.id || ''; }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) { status('⚠️ لینک معتبر شیت پشتیبان را وارد کن.'); return; }
  try {
    const client = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
      callback: async response => {
        try {
          if (response.error || !response.access_token) throw new Error('اجازه دسترسی صادر نشد');
          status('در حال خواندن و بررسی پشتیبان…');
          const auth = { Authorization: 'Bearer ' + response.access_token };
          const identityResponse = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: auth });
          if (!identityResponse.ok) throw new Error('حساب گوگل مشخص نشد');
          accountOwnerIdentify((await identityResponse.json()).email);
          const result = await accountOwnerFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent("'Backup'!A:B"), { headers: auth });
          if (!result.ok) throw new Error('شیت خوانده نشد (کد ' + result.status + '). حساب سازنده شیت و لینک را بررسی کن');
          const backup = googleBackupFromRows((await result.json()).values);
          const count = JSON.parse(backup.data.tx).length;
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = 'expense-google-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
          document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
          status('✅ پشتیبان بررسی شد: ' + count.toLocaleString('fa-IR') + ' تراکنش. فایل را در دانلودها بررسی کن؛ برای جایگزینی اطلاعات از بخش پشتیبان‌گیری، بازیابی فایل را انتخاب کن. اطلاعات فعلی هنوز تغییر نکرده است.');
        } catch (err) { status('⚠️ دریافت یا بررسی پشتیبان انجام نشد: ' + (err.message || 'خطای نامشخص')); }
        finally { googleTestBusy = false; googleTestButton(); }
      },
      error_callback: () => { googleTestBusy = false; status('⚠️ پنجره اجازه گوگل بسته شد یا باز نشد.'); googleTestButton(); }
    });
    googleTestBusy = true; status('در حال باز کردن پنجره اجازه گوگل…'); googleTestButton(); client.requestAccessToken({ prompt: 'select_account' });
  } catch (err) { googleTestBusy = false; status('⚠️ آماده‌سازی دسترسی گوگل ناموفق بود.'); googleTestButton(); }
}
function googleCreateBackupCopy() {
  if (googleTestBusy) return;
  if (localStorage.getItem('googleBackupCopyPending') && !confirm('تلاش قبلی ممکن است یک شیت ساخته باشد. ابتدا گوگل درایو را بررسی کن. یک شیت دیگر ساخته شود؟')) return;
  if (load('googleBackupCopy', null) && !confirm('قبلاً یک شیت پشتیبان ساخته شده است. یک شیت جداگانه دیگر ساخته شود؟')) return;
  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_TEST_CLIENT, scope: 'openid email https://www.googleapis.com/auth/drive.file',
      callback: async response => {
        let createdId = '', attempted = false;
        try {
          if (response.error || !response.access_token) throw new Error('اجازه دسترسی صادر نشد');
          const auth = { Authorization: 'Bearer ' + response.access_token };
          const userResponse = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: auth });
          if (!userResponse.ok) throw new Error('حساب گوگل مشخص نشد');
          const user = await userResponse.json(); accountOwnerIdentify(user.email);
          if (!user.email) throw new Error('ایمیل حساب دریافت نشد');
          const snapshot = makeFullBackup();
          ['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet', 'googleBackupCopy'].forEach(key => delete snapshot.data[key]);
          validateFullBackup(snapshot);
          if (!confirm('یک نسخه از اطلاعات این دستگاه در یک شیت جدید در حساب ' + user.email + ' ذخیره شود؟ شیت فعلی تغییر نمی‌کند و همگام‌سازی خودکار فعال نمی‌شود.')) { googleCopyStatus('ساخت پشتیبان لغو شد.'); return; }
          const serialized = JSON.stringify(snapshot), chunks = [];
          for (let index = 0; index < serialized.length; index += 12000) chunks.push(serialized.slice(index, index + 12000));
          const rows = [['format', 'expense-app-backup-v1'], ['chunks', String(chunks.length)], ...chunks.map((chunk, index) => [String(index + 1), chunk])];
          googleCopyStatus('در حال ساخت شیت پشتیبان جداگانه…');
          localStorage.setItem('googleBackupCopyPending', '1'); attempted = true;
          const created = await accountOwnerFetch('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { title: 'هزینه‌ها - پشتیبان ' + new Date().toISOString() }, sheets: [{ properties: { title: 'Backup' } }] }) });
          if (!created.ok) { if (created.status < 500) { localStorage.removeItem('googleBackupCopyPending'); attempted = false; } throw new Error('ساخت شیت پذیرفته نشد (کد ' + created.status + ')'); }
          const sheet = await created.json();
          if (!/^[a-zA-Z0-9_-]+$/.test(sheet.spreadsheetId || '')) throw new Error('شناسه شیت دریافت نشد');
          createdId = sheet.spreadsheetId;
          localStorage.setItem('googleBackupCopy', JSON.stringify({ id: createdId, email: user.email, verified: false }));
          localStorage.removeItem('googleBackupCopyPending'); attempted = false;
          const link = document.getElementById('google-copy-link'); if (link) link.innerHTML = googleCopyLink();
          const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(createdId) + '/values/' + encodeURIComponent("'Backup'!A1:B" + rows.length);
          googleCopyStatus('در حال نوشتن و بررسی نسخه پشتیبان…');
          const written = await accountOwnerFetch(url + '?valueInputOption=RAW', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ majorDimension: 'ROWS', values: rows }) });
          if (!written.ok) throw new Error('نوشتن اطلاعات کامل نشد (کد ' + written.status + ')');
          const checked = await accountOwnerFetch(url, { headers: auth });
          if (!checked.ok) throw new Error('خواندن مجدد اطلاعات کامل نشد (کد ' + checked.status + ')');
          const result = await checked.json();
          if (JSON.stringify(result.values) !== JSON.stringify(rows)) throw new Error('اطلاعات خوانده‌شده با نسخه ارسالی یکسان نیست');
          localStorage.setItem('googleBackupCopy', JSON.stringify({ id: createdId, email: user.email, verified: true }));
          googleCopyStatus('✅ نسخه پشتیبان جداگانه ساخته و با اطلاعات ارسالی مقایسه شد. همگام‌سازی خودکار فعال نیست.');
        } catch (err) {
          googleCopyStatus('⚠️ ' + (err.message || 'ساخت پشتیبان کامل نشد') + (createdId ? '؛ شیت ساخته شده ولی پشتیبان آن تأیید نشده است.' : attempted ? '؛ ممکن است شیت ساخته شده باشد، پیش از تلاش دوباره گوگل درایو را بررسی کن.' : ''));
        } finally { googleTestBusy = false; googleTestButton(); }
      },
      error_callback: () => { googleTestBusy = false; googleCopyStatus('⚠️ پنجره اجازه گوگل بسته شد یا باز نشد.'); googleTestButton(); }
    });
    googleTestBusy = true; googleCopyStatus('در حال باز کردن پنجره اجازه گوگل…'); googleTestButton();
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (err) { googleTestBusy = false; googleCopyStatus('⚠️ آماده‌سازی ناموفق بود.'); googleTestButton(); }
}

// ---- همگام‌سازی با Google Sheets ----
function easyMainSyncUrl() {
  try {
    const value = JSON.parse(localStorage.getItem('easySetupExperimentV1') || '{}').mainUrl;
    if (typeof value !== 'string') return '';
    const url = new URL(value);
    return url.protocol === 'https:' && url.host === 'script.google.com' && !url.username && !url.password && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash ? url.href : '';
  } catch (_) { return ''; }
}
const SYNC = () => localStorage.getItem('legacySyncPaused') === '1' ? null : (localStorage.getItem('sync') || localStorage.getItem('sync_bak'));
const directReceiveLegacyAtBoot = !!SYNC();
let pulled = false, syncMsg = '', pt = null, legacyInFlight = 0;
function pauseLegacySync() {
  if (legacyInFlight) throw new Error('همگام‌سازی قبلی هنوز در جریان است؛ پس از پایان آن دوباره تلاش کن');
  clearTimeout(pt);
  localStorage.setItem('noSync', '1');
  localStorage.setItem('legacySyncPaused', '1');
  pulled = false;
}
function push() {
  if (!SYNC() || !pulled) return;
  clearTimeout(pt); pt = setTimeout(doPush, 1200);
}
async function doPush(manualUrl = null) {
  const url = manualUrl || SYNC(); if (!url) return false;
  const current = () => !accountOwnerLocked() && (manualUrl ? localStorage.getItem('legacySyncPaused') === '1' && easyMainSyncUrl() === url : SYNC() === url);
  legacyInFlight++;
  try {
    const r = await (await accountOwnerFetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ tx, accounts, rem, profile: { job: job(), work: work(), cols: localStorage.getItem('cols') || '{}', lab: JSON.stringify({ cats: localStorage.getItem('cats'), icats: localStorage.getItem('icats'), ctypes: localStorage.getItem('ctypes'), svq: localStorage.getItem('svq'), carModels: localStorage.getItem('carModels'), defaultCustomerType: localStorage.getItem('defaultCustomerType'), ppl: localStorage.getItem('ppl'), pplIgnored: localStorage.getItem('pplIgnored') }) }, log: log.slice(0, 100) }) })).json();
    if (!current()) return false;
    if (!r.ok) throw new Error(r.error);
    if (!manualUrl) localStorage.removeItem('dirty'); localStorage.setItem('lastSync', Date.now()); noteSyncSuccess159(); syncMsg = '✅ ذخیره در شیت ' + new Date().toLocaleTimeString('fa-IR'); return true;
  } catch (e) { syncMsg = '⚠️ ارسال به شیت نشد: ' + (e && e.message || e) + (manualUrl ? '؛ نتیجه را پیش از تلاش مجدد بررسی کن.' : ' — بعداً دوباره تلاش می‌شود'); return false; } finally { legacyInFlight--; }
}
function manualJsonpRead(url) {
  accountOwnerAssert();
  return new Promise((resolve, reject) => {
    const bytes = new Uint32Array(2); crypto.getRandomValues(bytes);
    const name = 'expenseRead' + bytes[0] + '_' + bytes[1];
    const tag = document.createElement('script'); let done = false;
    const finish = (error, data) => { if (done) return; done = true; clearTimeout(timer); delete window[name]; tag.remove(); error ? reject(error) : resolve(data); };
    window[name] = data => { try { accountOwnerAssert(); finish(null, data); } catch (error) { finish(error); } };
    tag.onerror = () => finish(new Error('بارگذاری پاسخ JSONP ناموفق بود؛ شبکه یا دسترسی انتشار را بررسی کن.'));
    tag.onload = () => { if (!done) finish(new Error('اسکریپت اصلی پاسخ JSONP نداد؛ انتشار اصلی باید از JSONP پشتیبانی کند.')); };
    const timer = setTimeout(() => finish(new Error('پاسخ JSONP تا ۲۰ ثانیه نرسید.')), 20000);
    const target = new URL(url); target.searchParams.set('callback', name); tag.src = target.href; document.head.appendChild(tag);
  });
}
async function pull(manualUrl = null) {
  const url = manualUrl || SYNC(); if (!url) return;
  const current = () => !accountOwnerLocked() && (manualUrl ? localStorage.getItem('legacySyncPaused') === '1' && easyMainSyncUrl() === url : SYNC() === url);
  legacyInFlight++;
  try {
    let rs, txt, d;
    try { rs = await accountOwnerFetch(url); txt = await rs.text(); }
    catch (fetchError) {
      if (!manualUrl) throw fetchError;
      try { d = await manualJsonpRead(url); }
      catch (jsonpError) { throw new Error('دریافت معمولی: ' + (fetchError.message || fetchError) + '؛ دریافت جایگزین: ' + (jsonpError.message || jsonpError)); }
    }
    if (!current()) throw new Error('وضعیت اتصال تغییر کرد');
    if (d === undefined) { try { d = JSON.parse(txt); } catch (_) { throw new Error(rs.status + ' ' + (/<title>(.*?)<\/title>/i.exec(txt)?.[1] || 'پاسخ JSON نیست (دسترسی Anyone نیست؟)')); } }
    if (!d.ok) throw new Error(d.error || 'bad');
    if (!manualUrl && d.sheetUrl) localStorage.setItem('sheetUrl', d.sheetUrl);
    const dirty = localStorage.getItem('dirty');
    const gone0 = new Set(JSON.parse(localStorage.getItem('txDel') || '[]')); d.tx = d.tx.filter(t => !gone0.has(String(t.id)));
    const sid = new Set(d.tx.map(t => String(t.id))), lid = new Set(tx.map(t => String(t.id)));
    const localOnly = tx.filter(t => !sid.has(String(t.id)));
    const base = dirty ? [...tx, ...d.tx.filter(t => !lid.has(String(t.id)))] : [...d.tx, ...localOnly];
    tx = base.sort((a, b) => (a.date < b.date ? 1 : -1));
    accounts = { ...d.accounts, ...accounts }; JSON.parse(localStorage.getItem('delAcc') || '[]').forEach(k => { if (!tx.some(t => t.account === k)) delete accounts[k]; });
    if (Array.isArray(d.rem)) {
      const gone = new Set(JSON.parse(localStorage.getItem('remDel') || '[]').map(String)), lr = new Set(rem.map(r => String(r.id))), sr = new Set(d.rem.map(r => String(r.id)));
      const merged = [...rem, ...d.rem.filter(r => !lr.has(String(r.id)) && !gone.has(String(r.id)))];
      if (rem.some(r => !sr.has(String(r.id))) || merged.length !== d.rem.length) localStorage.setItem('dirty', '1');
      rem = merged; localStorage.setItem('rem', JSON.stringify(rem));
    }
    if (d.profile && !dirty) { if (d.profile.job) localStorage.setItem('job', d.profile.job); if (d.profile.work) localStorage.setItem('work', d.profile.work); if (d.profile.cols && d.profile.cols !== '{}') localStorage.setItem('cols', d.profile.cols); if (d.profile.lab && !dirty) { try { const L = JSON.parse(d.profile.lab); for (const k in L) if (L[k]) localStorage.setItem(k, L[k]); } catch (e) {} } }
    const at = new Set(log.map(l => l.at)), lgone = new Set(JSON.parse(localStorage.getItem('logDel') || '[]')); log = [...log, ...d.log.filter(l => !at.has(l.at) && !lgone.has(l.at))].sort((a, b) => b.at - a.at).slice(0, 100);
    localStorage.setItem('tx', JSON.stringify(tx)); localStorage.setItem('accounts', JSON.stringify(accounts)); localStorage.setItem('log', JSON.stringify(log));
    if (localOnly.length || (tx.length && !d.tx.length)) localStorage.setItem('dirty', '1');
    if (!manualUrl) { pulled = true; lastPull = Date.now(); localStorage.setItem('sync_bak', SYNC()); localStorage.setItem('syncLock', '1'); }
    syncMsg = '✅ دریافت از شیت انجام شد';
    matchTransfers();
    noteSyncSuccess159();
    if (manualUrl) {
      if (d.inbox && d.inbox.length) syncMsg += '؛ پیامک‌های صندوق روی شیت باقی ماندند و ارسالی انجام نشد.';
      else syncMsg += '؛ ارسالی به شیت انجام نشد.';
    } else if (d.inbox && d.inbox.length) {
      d.inbox.forEach(i => addSms(i.raw)); localStorage.setItem('dirty', '1');
      const sent = await doPush(manualUrl);
      if (manualUrl && !sent) return;
      if (current()) await accountOwnerFetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ack: d.inbox.map(i => i.id) }) }).catch(() => {});
    }
    if (!manualUrl && localStorage.getItem('dirty')) await doPush();
  } catch (e) { syncMsg = '⚠️ اتصال به شیت برقرار نشد: ' + (e.message || e); } finally { legacyInFlight--; }
}
let lastPull = 0;
let editingUntil = 0;
document.addEventListener('pointerdown', e => { if (!e.target.closest('#direct-sync') && e.target.closest('.card[data-id], #pform, #app details')) editingUntil = Date.now() + 120000; });
document.addEventListener('input', e => { if (!e.target.closest('#direct-sync') && e.target.closest('#app')) editingUntil = Date.now() + 120000; });
const busyTyping = () => {
  const active = document.activeElement;
  const syncControl = active && active.closest && active.closest('#direct-sync') && active.tagName === 'INPUT' && ['checkbox', 'radio', 'button', 'submit'].includes(active.type);
  const editable = active && !active.disabled && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && !syncControl;
  return !!editable || Date.now() < editingUntil;
};
function directAutoCanApply() {
  return tab === 'home' && !busyTyping() && editing.size === 0 && Object.keys(drafts).length === 0 && !pEditing;
}
function directReceiveRefreshView() {
  tx = load('tx', []);
  tx.forEach(item => { if ((item.loan === 'wage' || item.loan === 'share') && item.cat === 'قرض') item.cat = 'کارکرد همکار'; });
  accounts = load('accounts', {}); log = load('log', []); rem = load('rem', []); ppl = load('ppl', []);
  sel = load('sel', null); ord = localStorage.getItem('ord') || 'sms'; undo = [];
  CATS.splice(0, CATS.length, ...lsj('cats', [...DEFAULT_CATS]));
  INC.splice(0, INC.length, ...lsj('icats', [...DEFAULT_INC]));
  render();
}
async function refresh() { if (!SYNC()) return; await pull(); if (!busyTyping() && tab !== 'add') render(); }
document.addEventListener('visibilitychange', async () => { if (document.visibilityState !== 'visible') return; if (localStorage.getItem('legacyInboxAuto') === '1') legacyInboxCheck(false); if (!pulled || Date.now() - lastPull > 15000) refresh(); else if (localStorage.getItem('dirty')) push(); });
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
addEventListener('online', () => { if (!pulled) pull().then(() => { if (!busyTyping()) render(); }); else push(); });
navigator.storage?.persist?.();

const RT = { check: 'چک', inst: 'قسط', custom: 'سفارشی' };
let rem = JSON.parse(localStorage.getItem('rem') || '[]');
matchTransfers();
handleUrl();
function autoDedupe() {
  const G = {}; tx.filter(t => !t.ghost && t.date).forEach(t => { const k = [t.type, t.amount, t.date].join('|'); (G[k] = G[k] || []).push(t); });
  const sc = t => (t.receipt ? 4 : 0) + (t.person ? 2 : 0) + (t.desc ? 1 : 0) + (t.cat ? 1 : 0); let n = 0;
  Object.values(G).filter(g => g.length > 1).forEach(g => {
    const k = g.slice().sort((a, b) => sc(b) - sc(a))[0];
    g.forEach(o => { if (o === k) return; for (const f in o) if (k[f] === undefined || k[f] === '' || k[f] === null) k[f] = o[f]; tx.forEach(c => { if (c.parent === o.id) c.parent = k.id; }); });
    const ids = new Set(g.filter(o => o !== k).map(o => o.id)); tx = tx.filter(t => !ids.has(t.id)); n += ids.size;
  });
  if (n) save(); return n;
}
autoDedupe(); rcTryPending();
render();
if (load('directSyncState', null)?.id) prepareGoogleTest();
if (localStorage.getItem('legacyInboxAuto') === '1') setTimeout(() => legacyInboxCheck(false), 0);
pull().then(() => { autoDedupe(); rcTryPending(); if (!busyTyping()) render(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ===== یادآوری‌ها (فقط روی همین دستگاه) ===== */
const saveRem = () => { localStorage.setItem('rem', JSON.stringify(rem)); localStorage.setItem('dirty', '1'); push(); };
const fa = d => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' }).format(d);
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function nextDue(r) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  let d = new Date(r.date + 'T00:00:00'), n = 0;
  const step = r.type === 'inst' ? 1 : r.rep === 'm' ? 1 : r.rep === 'y' ? 12 : 0;
  const lim = r.type === 'inst' ? (r.count || 1) : 999;
  while (d < t0 && step && n < lim - 1) { n++; d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate()); }
  return { d, left: r.type === 'inst' ? lim - n : null, days: Math.round((d - t0) / 864e5) };
}
function dueList() {
  return rem.map(r => ({ r, ...nextDue(r) })).filter(x => !(x.days < 0 && (x.r.type === 'check' || !x.r.rep && x.r.type === 'custom') && x.r.done)).sort((a, b) => a.days - b.days);
}
function remBanner() {
  const L = dueList().filter(x => x.days <= (x.r.before || 3) && x.days >= -30 && !x.r.done && !(tab === 'home' && topic === 'expenses' && (x.days === 3 || x.days === 1)));
  return L.length ? `<div class="card noacc" style="border:2px solid #ef4444"><b>⏰ یادآوری</b>${L.map(x => `<div class="row" style="margin-top:6px"><span>${esc(x.r.title)} — ${x.days < 0 ? Math.abs(x.days).toLocaleString('fa-IR') + ' روز گذشته' : x.days === 0 ? 'امروز' : x.days.toLocaleString('fa-IR') + ' روز دیگر'}</span><button class="sec rdn" data-i="${x.r.id}" style="padding:4px 10px">✓ انجام شد</button></div>`).join('')}</div>` : '';
}
function dueBanner157() {
  const now = new Date(), today = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  const stored = load('remShown', {}), shown = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const items = dueList(), fresh = dueNotices157(items, shown, today).filter(x => !visibleRem157.has(x.key));
  fresh.forEach(x => {
    shown[x.key] = 'shown'; visibleRem157.add(x.key);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('یادآوری سررسید', { body: x.r.title + (x.days === 1 ? ' فردا سررسید دارد' : ' تا ۳ روز دیگر سررسید دارد') }); } catch (_) {}
    }
  });
  if (fresh.length) { try { localStorage.setItem('remShown', JSON.stringify(shown)); } catch (_) {} }
  const visible = items.filter(x => { const key = String(x.r.id) + '|' + x.days + '|' + today; return !x.r.done && visibleRem157.has(key) && shown[key] !== 'dismissed'; });
  return visible.length ? `<div class="card noacc" style="border:2px solid #f59e0b"><b>⏰ سررسید نزدیک</b>${visible.map(x => `<div class="row"><span>${esc(x.r.title)} ${x.days === 1 ? 'فردا' : 'تا ۳ روز دیگر'} سررسید دارد</span><button type="button" class="sec due-later" data-key="${esc(String(x.r.id) + '|' + x.days + '|' + today)}">بعداً</button></div>`).join('')}</div>` : '';
}
document.addEventListener('click', e => {
  const button = e.target.closest('.due-later'); if (!button) return;
  const shown = load('remShown', {}); shown[button.dataset.key] = 'dismissed'; visibleRem157.delete(button.dataset.key);
  try { localStorage.setItem('remShown', JSON.stringify(shown)); } catch (_) {} render();
});
function remHtml() {
  const L = dueList();
  return remBanner() + `<div class="card"><b>افزودن یادآوری</b>
    <select id="rt"><option value="check">ثبت/سررسید چک</option><option value="inst">قسط</option><option value="custom">سفارشی (شهریه، باشگاه…)</option></select>
    <input id="rn" placeholder="عنوان (مثلاً: چک ملت، قسط وام، شهریه)">
    <input id="ra" type="text" inputmode="numeric" placeholder="مبلغ به تومان (اختیاری)">
    <div class="mut" id="rdl">تاریخ سررسید:</div>${persianDateFields('rd-persian')}<input id="rd" type="hidden">
    <div class="mut">چند روز قبل هشدار؟ (چند عدد با ویرگول، مثلاً ۷,۳,۱)</div><input id="rb" value="7,3,1" dir="ltr">
    <div id="rc" class="hide"><input id="rk" type="number" inputmode="numeric" placeholder="تعداد کل اقساط (ماهانه)"></div>
    <select id="rr" class="hide"><option value="">تکرار ندارد</option><option value="m">هر ماه</option><option value="y">هر سال</option></select>
    <button id="rg">افزودن</button>
    <div class="mut" style="margin-top:8px">قسط یعنی بدهی که ماهانه و در مبلغ ثابت پرداخت می‌شود (وام، خرید اقساطی). برنامه هر ماه سررسید بعدی را نشان می‌دهد.</div></div>
  <div class="card"><b>لیست</b>${L.filter(x => !x.r.done).length ? L.filter(x => !x.r.done).map(x => `<div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><b>${RT[x.r.type]} · ${esc(x.r.title)}</b>${x.r.amount ? ' · ' + toman(x.r.amount * 10) + ' تومان' : ''}
    <div class="mut">${fa(x.d)} · ${x.r.done ? '✅ انجام شد' : x.days < 0 ? Math.abs(x.days).toLocaleString('fa-IR') + ' روز گذشته' : x.days.toLocaleString('fa-IR') + ' روز مانده'}${x.left != null ? ' · ' + x.left.toLocaleString('fa-IR') + ' قسط باقی‌مانده' : ''}</div>
    <div class="row"><button class="sec rdn" data-i="${x.r.id}">${x.r.done ? 'برگشت' : 'انجام شد'}</button><button class="sec rics" data-i="${x.r.id}">تقویم (هشدار)</button><button class="sec rdl2" data-i="${x.r.id}">حذف</button></div></div>`).join('') : '<div class="mut">چیزی ثبت نشده</div>'}</div>
  <div class="card"><b>✅ انجام‌شده‌ها</b>${rem.filter(r => r.done).length ? rem.filter(r => r.done).map(r => `<div class="row" style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><span>${RT[r.type]} · ${esc(r.title)}${r.amount ? ' · ' + toman(r.amount * 10) + ' تومان' : ''}<div class="mut">${esc(r.date)}</div></span><span><button class="sec rdn" data-i="${r.id}">برگشت</button> <button class="sec rdl2" data-i="${r.id}">حذف</button></span></div>`).join('') : '<div class="mut">هنوز چیزی انجام نشده</div>'}</div>
  <div class="card"><b>ℹ️ راهنما</b><div class="mut">اعلان خودکار در PWA آیفون بدون سرور مطمئن نیست؛ پس «تقویم (هشدار)» فایل تقویم با هشدارهای تعیین‌شده می‌سازد که آیفون خودش اعلان می‌دهد. همچنین موارد نزدیک بالای صفحهٔ خانه نشان داده می‌شوند. یادآوری‌ها فقط روی همین دستگاه ذخیره می‌شوند.</div></div>`;
}
function remBind() {
  const ty = () => { const t = $('#rt').value; $('#rc').classList.toggle('hide', t !== 'inst'); $('#rr').classList.toggle('hide', t !== 'custom'); $('#rdl').textContent = t === 'inst' ? 'تاریخ اولین قسط:' : 'تاریخ سررسید:'; };
  $('#rt').onchange = ty; ty();
  $('#rg').onclick = () => {
    const title = $('#rn').value.trim(), date = persianToIso($('#rd-persian').value.trim()); if (!title || !date) { alert('عنوان و تاریخ شمسی معتبر لازم است'); return; }
    const bs = $('#rb').value.split(/[,،]/).map(x => +x.trim()).filter(x => x >= 0);
    const t = $('#rt').value;
    const amount = $('#ra').value ? invoiceDigits($('#ra').value) : 0; if (amount === null || !Number.isSafeInteger(amount * 10)) { alert('مبلغ معتبر به تومان وارد کن'); return; }
    rem.push({ id: Date.now(), type: t, title, date, amount, alerts: bs.length ? bs : [3], before: Math.max(...(bs.length ? bs : [3])), count: t === 'inst' ? +$('#rk').value || 1 : 0, rep: t === 'custom' ? $('#rr').value : '' });
    saveRem(); render();
  };
  document.querySelectorAll('.rdn').forEach(b => b.onclick = () => { const r = rem.find(x => x.id == b.dataset.i); r.done = !r.done; saveRem(); render(); });
  document.querySelectorAll('.rdl2').forEach(b => b.onclick = () => { if (confirm('حذف شود؟ مطمئنی؟')) { const dl = JSON.parse(localStorage.getItem('remDel') || '[]'); dl.push(b.dataset.i); localStorage.setItem('remDel', JSON.stringify(dl)); rem = rem.filter(x => x.id != b.dataset.i); saveRem(); render(); } });
  document.querySelectorAll('.rics').forEach(b => b.onclick = () => remIcs(rem.find(x => x.id == b.dataset.i)));
}
function remIcs(r) {
  const d = new Date(r.date + 'T09:00:00'), f = x => x.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const rr = r.type === 'inst' ? `RRULE:FREQ=MONTHLY;COUNT=${r.count || 1}\n` : r.rep === 'm' ? 'RRULE:FREQ=MONTHLY\n' : r.rep === 'y' ? 'RRULE:FREQ=YEARLY\n' : '';
  const al = (r.alerts || [3]).map(n => `BEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:${r.title}\nTRIGGER:-P${n}D\nEND:VALARM\n`).join('') + 'BEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:' + r.title + '\nTRIGGER:PT0S\nEND:VALARM\n';
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//exp//FA\nBEGIN:VEVENT\nUID:${r.id}@exp\nDTSTAMP:${f(new Date())}\nDTSTART:${f(d)}\nSUMMARY:${RT[r.type]}: ${r.title}\n${rr}${al}END:VEVENT\nEND:VCALENDAR\n`.replace(/\n/g, '\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'reminder.ics'; a.click();
}

document.addEventListener('input', e => {
  if (e.target.id !== 'cq') return;
  const q = e.target.value.trim().toLowerCase(), box = $('#cqr');
  if (!q) { box.innerHTML = ''; return; }
  const r = tx.filter(t => !t.pending && [t.customer, t.service, t.desc].some(x => x && String(x).toLowerCase().includes(q))).sort((a, b) => (a.date < b.date ? 1 : -1));
  const tot = r.reduce((s, t) => s + (t.type === 'credit' ? t.amount : -t.amount), 0);
  box.innerHTML = `<div class="mut" style="margin:8px 0">${r.length.toLocaleString('fa-IR')} مورد · جمع: ${toman(tot)}</div>` + r.slice(0, 50).map(rowHtml).join('');
});

// ---- صفحهٔ راه‌اندازی ----
if (!window._gs) fetch('Code.gs').then(r => r.text()).then(t => { window._gs = t; }).catch(() => {});
function setupHtml() {
  const st = n => `<span class="chip" style="display:inline-block;margin-left:6px">${n}</span>`;
  return `<div class="card"><b>👋 خوش آمدید؛ راه‌اندازی (حدود ۵ دقیقه، فقط یک بار)</b>
    <div class="mut">اطلاعات شما فقط در Google Sheet خودتان ذخیره می‌شود و هیچ‌کس دیگری به آن دسترسی ندارد. برای این کار به یک حساب Gmail نیاز دارید.</div></div>
  <div class="card"><div>${st(1)}دکمهٔ زیر را بزنید تا کد کپی شود:</div><button id="stc">📋 کپی کد</button> <span class="mut" id="stm"></span><div id="stbox"></div></div>
  <div class="card"><div>${st(2)}یک شیت خالی بسازید:</div><button class="sec" id="sto">📄 باز کردن Google Sheet جدید</button></div>
  <div class="card"><div>${st(3)}در شیت: منوی <b>Extensions</b> ← <b>Apps Script</b>. همهٔ کدِ داخل صفحه را پاک کنید و کد کپی‌شده را بچسبانید. سپس دکمهٔ ذخیره (💾).</div></div>
  <div class="card"><div>${st(4)}بالا سمت راست <b>Deploy</b> ← <b>New deployment</b> ← چرخ‌دنده ⚙ ← <b>Web app</b>. این دو را تنظیم کنید:</div>
    <div class="mut">Execute as: <b>Me</b><br>Who has access: <b>Anyone</b></div>
    <div class="mut">روی Deploy بزنید و اجازه‌ها را بپذیرید (اگر «Google hasn't verified» آمد: Advanced ← Go to … ← Allow).</div></div>
  <div class="card"><div>${st(5)}آدرس Web app (که به <code>/exec</code> ختم می‌شود) را کپی و اینجا بچسبانید:</div>
    <input id="stu" placeholder="https://script.google.com/macros/s/…/exec" dir="ltr"><button id="stt">✅ امتحان اتصال</button>
    <div class="mut" id="stx"></div></div>
  <div class="card"><b>📱 ثبت خودکار پیامک (اختیاری، بعد از راه‌اندازی)</b>
    <div class="mut"><b>آیفون:</b> برنامهٔ Shortcuts ← Automation ← «+» ← Message ← فرستنده: شمارهٔ بانک ← Run Immediately. عمل: «Get Contents of URL» با آدرس <code>آدرس‌اسکریپت?sms=</code> + متن پیام (Message).<br>
    <b>اندروید:</b> برنامهٔ MacroDroid ← ماکروی جدید ← Trigger: «SMS Received» (فرستندهٔ بانک) ← Action: «HTTP Request» (GET) به <code>آدرس‌اسکریپت?sms=</code> + متغیر <code>[sms_message]</code>.<br>
    برای ثبت دستی سریع: صفحهٔ برنامه را با <code>؟add=1</code> به صفحهٔ اصلی گوشی اضافه کنید.</div></div>
  <div class="card"><button class="sec" id="stn">بدون شیت ادامه می‌دهم (فقط روی همین گوشی)</button></div>`;
}
document.addEventListener('click', async e => {
  const id = e.target.id; if (!id || id[0] !== 's' || id[1] !== 't') return;
  if (id === 'stc') { const t = window._gs || ''; let ok = false; if (t) { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;opacity:0'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length); ok = document.execCommand('copy'); ta.remove(); } catch (_) {} } if (ok) $('#stm').textContent = '✅ کپی شد'; else { $('#stm').textContent = 'کپی خودکار نشد؛ داخل کادر زیر نگه دارید ← Select All ← Copy'; $('#stbox').innerHTML = '<textarea readonly style="width:100%;height:120px;direction:ltr" onfocus="this.select()">' + t.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</textarea>'; } }
  if (id === 'sto') window.open('https://sheets.new', '_blank');
  if (id === 'stn') { localStorage.setItem('noSync', '1'); render(); }
  if (id === 'stt') {
    const u = $('#stu').value.trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) { $('#stx').textContent = '⚠️ آدرس باید با https://script.google.com شروع و به /exec ختم شود'; return; }
    $('#stx').textContent = 'در حال اتصال…';
    localStorage.setItem('sync', u); pulled = false; await pull();
    if (pulled) render(); else { localStorage.removeItem('sync'); $('#stx').textContent = syncMsg; }
  }
});

// ---- شمارش ناشناس بازدید (GoatCounter؛ فقط تعداد، بدون هیچ اطلاعات مالی) ----
const GC_CODE = ''; // مثلاً 'expense-app' برای expense-app.goatcounter.com
(function () {
  if (!GC_CODE) return;
  try { const k = new Date().toDateString(); if (localStorage.getItem('gcDay') === k) return; localStorage.setItem('gcDay', k);
    new Image().src = `https://${GC_CODE}.goatcounter.com/count?p=/open&t=open&r=&rnd=${Date.now()}`; } catch (_) {}
})();

// ---- رسید بانکی پرداخت‌ها ----
document.addEventListener('click', e => {
  const add = e.target.closest('.rcpadd'), del = e.target.closest('.rcpdel');
  if (!add && !del) return;
  const id = Number((add || del).dataset.id), t = tx.find(x => x.id === id);
  if (!t) return;
  if (del) { if (!confirm('رسید این پرداخت حذف شود؟')) return; delete t.receipt; save(); render(); return; }
  const txt = (add.closest('details').querySelector('.rcpin').value || '').trim();
  if (!txt) { alert('متن پیامک رسید را بچسبان'); return; }
  t.receipt = txt.slice(0, 1000);
  archiveReceipts([{ raw: txt }]);
  // اگر نام یکی از اشخاص در رسید باشد، پرداخت به همان شخص وصل شود
  const names = [...new Set([...Object.keys(cols()), ...Object.keys(pjobs())])].filter(n => n && txt.includes(n));
  if (names.length === 1 && names[0] !== t.person) { if (confirm('این رسید به نام «' + names[0] + '» است. پرداخت به همین شخص وصل شود؟')) t.person = names[0]; }
  save(); render();
});

document.addEventListener('input', e => {
  if (!e.target.classList.contains('cu')) return;
  const card = e.target.closest('.card[data-id]'), b = card && card.querySelector('.ctbox'); if (!b) return;
  const n = e.target.value.trim(), p = tx.find(t => t.customer === n && t.ctype); if (!p || b.dataset.ct) return;
  b.dataset.ct = p.ctype; b.querySelectorAll('.ctb').forEach(x => x.classList.toggle('on', x.dataset.v === p.ctype));
  const ph = card.querySelector('.cph'); if (ph && !ph.value && p.cphone) ph.value = p.cphone;
});

document.addEventListener('change', e => { if (!e.target.classList.contains('cs')) return; const c = e.target.closest('.card'); c.querySelector('.p').value = e.target.value; const l = c.querySelector('.lk'); if (l && e.target.value && !l.value) l.value = 'wage'; });
document.addEventListener('click', e => { if (!e.target.classList.contains('cp')) return; const l = e.target.closest('.card').querySelector('.lk'); if (l && !l.value) l.value = 'wage'; });

document.addEventListener('change', e => { if (!e.target.classList.contains('catsel')) return; const c = e.target.closest('.card'); c.dataset.cat = e.target.value; (drafts[c.dataset.id] = drafts[c.dataset.id] || {}).cat = e.target.value; });
document.addEventListener('input', e => { if (!e.target.matches('.card[data-id] .p, .card[data-id] .d')) return; updateCategorySuggestion(e.target.closest('.card[data-id]')); });
document.addEventListener('click', e => {
  const button = e.target.closest('.catsuggestion'); if (!button) return;
  const card = button.closest('.card[data-id]'), select = card && card.querySelector('.catsel');
  if (!select || !CATS.includes(button.dataset.category)) return;
  select.value = button.dataset.category; select.dispatchEvent(new Event('change', { bubbles: true }));
});


// ===== مخاطبین =====
let ppl = load('ppl', []), cv = 'work', pe = null, pq = '', pf = '', pEditing = false;
const savePpl = () => { localStorage.setItem('ppl', JSON.stringify(ppl)); localStorage.setItem('dirty', '1'); push(); };
const PT0 = ['مشتری', 'راننده', 'همکار', 'تأمین‌کننده', 'خانواده'];
const ptags = () => [...new Set([...PT0, ...ppl.flatMap(p => p.tags || [])])];
const pfa = s => String(s || '').replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
function carModels() { try { const v = JSON.parse(localStorage.getItem('carModels')); return Array.isArray(v) ? v : ['اسکانیا', 'ولوو']; } catch { return ['اسکانیا', 'ولوو']; } }
const idDigits = s => pfa(s).replace(/\D/g, '');
function contactFacts() {
  const out = [];
  tx.filter(t => !t.ghost).forEach(t => {
    const phone = idDigits(t.cphone || '');
    if (t.customer && phone.length >= 10) out.push({ key: String(t.id) + '|customer', tid: String(t.id), name: t.customer.trim(), phone, card: '', role: t.ctype === 'driver' ? 'راننده' : 'مشتری' });
    if (t.receipt) {
      const rc = parseReceipt(t.receipt), normalized = pfa(t.receipt).replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
      const m = normalized.match(/به\s*مقصد\s*([\d\s-]{16,24})/), card = m ? idDigits(m[1]) : '';
      if (rc && rc.name && card.length === 16) out.push({ key: String(t.id) + '|receipt', tid: String(t.id), name: rc.name, phone: '', card, role: t.loan ? 'شخص' : 'تأمین‌کننده' });
    }
  });
  return out;
}
function contactCardList(p) { return Array.isArray(p.cards) ? p.cards.map(idDigits).filter(x => x.length === 16) : []; }
function contactMatches(p, f) { return !!((f.phone && [p.phone, ...(Array.isArray(p.phones) ? p.phones : [])].map(idDigits).includes(f.phone)) || (f.card && contactCardList(p).includes(f.card))); }
function contactNames(p) { return [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])].filter(Boolean).map(nrm); }
function attachFact(p, f, rememberName) {
  p.links = Array.isArray(p.links) ? p.links : [];
  if (!p.links.includes(f.key)) p.links.push(f.key);
  if (f.card) { p.cards = contactCardList(p); if (!p.cards.includes(f.card)) p.cards.push(f.card); }
  if (f.phone && !p.phone) p.phone = f.phone;
  else if (f.phone && idDigits(p.phone) !== f.phone) { p.phones = Array.isArray(p.phones) ? p.phones : []; if (!p.phones.includes(f.phone)) p.phones.push(f.phone); }
  if (rememberName && !contactNames(p).includes(nrm(f.name))) { p.aliases = Array.isArray(p.aliases) ? p.aliases : []; p.aliases.push(f.name); }
  p.tags = Array.isArray(p.tags) ? p.tags : [];
  if (f.role !== 'شخص' && !p.tags.includes(f.role)) p.tags.push(f.role);
  if (f.role === 'راننده' && !p.tags.includes('مشتری')) p.tags.push('مشتری');
}
function reconcileContacts() {
  const facts = contactFacts(), proposals = [], ignored = new Set(load('pplIgnored', [])), factByKey = new Map(facts.map(f => [f.key, f])); let changed = false;
  for (const p of ppl) {
    if (!Array.isArray(p.links)) continue;
    const valid = p.links.filter(key => { const f = factByKey.get(key); return f && contactMatches(p, f) && contactNames(p).includes(nrm(f.name)); });
    if (valid.length !== p.links.length) { p.links = valid; changed = true; }
  }
  for (const f of facts) {
    if (!f.name || ignored.has(f.key) || ppl.some(p => Array.isArray(p.links) && p.links.includes(f.key))) continue;
    const exact = ppl.filter(p => contactMatches(p, f));
    const near = ppl.filter(p => contactNames(p).some(n => n === nrm(f.name) || (n.length >= 5 && nrm(f.name).length >= 5 && lev(n, nrm(f.name)) <= 2)));
    if (exact.length === 1 && contactNames(exact[0]).includes(nrm(f.name))) { attachFact(exact[0], f, false); changed = true; }
    else if (exact.length || near.length) proposals.push({ f, options: [...new Set([...exact, ...near])] });
    else { const p = { id: Date.now() + Math.random(), name: f.name, phone: '', cards: [], tags: [], cars: [], note: '', links: [] }; attachFact(p, f, false); ppl.push(p); changed = true; }
  }
  if (changed) savePpl();
  return proposals;
}
function contactHistory(p) {
  const keys = new Set(Array.isArray(p.links) ? p.links : []), ids = new Set([...keys].map(x => x.split('|')[0]));
  const list = ordTx(tx.filter(t => ids.has(String(t.id)) && !t.ghost));
  const account = amountOf(tx.filter(t => t.loan && LOAN[t.loan] && !isWage(t) && ids.has(String(t.id))));
  return `<details class="card"><summary><b>📋 سابقه ارتباط (${list.length.toLocaleString('fa-IR')})</b></summary><div class="mut">فقط مواردی که با شماره کارت یا تلفن تأیید شده‌اند.</div>${list.map(t => `<div style="border-bottom:1px solid #eee;padding:8px 0"><div class="row"><b>${esc(t.loan ? LOAN[t.loan]?.[0] || 'تراکنش' : t.type === 'credit' ? 'واریزی / فروش یا خدمت' : 'پرداخت / خرید')}</b><b class="${t.type === 'credit' ? 'grn' : 'red'}">${toman(t.amount)} تومان</b></div><div class="mut">${esc(t.date)} · ${esc(accName(t.account))}</div>${t.desc ? `<div>${esc(t.desc)}</div>` : ''}${t.service ? `<div class="mut">خدمت: ${esc(t.service)}</div>` : ''}${t.receipt ? `<details><summary class="mut">رسید بانکی</summary><div style="white-space:pre-wrap">${esc(t.receipt)}</div></details>` : ''}${t.raw ? `<details><summary class="mut">متن پیامک</summary><div style="white-space:pre-wrap">${esc(t.raw)}</div></details>` : ''}</div>`).join('') || '<div class="mut">هنوز سابقه تأییدشده‌ای نیست.</div>'}${account ? `<div class="mut">مانده قرض‌های مرتبط با این موارد: ${account > 0 ? 'طلب من' : 'بدهی من'} ${toman(Math.abs(account))} تومان</div>` : ''}</details>`;
}
function contactsHtml() {
  ppl = load('ppl', []);
  const proposals = reconcileContacts();
  if (!featureOn('assistant') && !featureOn('loan') && cv === 'work') cv = 'list';
  const sw = `<div class="row" style="margin-bottom:8px"><button class="${cv === 'list' ? '' : 'sec'}" data-cv="list">👥 مخاطبین</button><button ${!featureOn('assistant') && !featureOn('loan') ? 'hidden' : ''} class="${cv === 'work' ? '' : 'sec'}" data-cv="work">🤝 ${featureOn('assistant') ? 'دستیاران و کارکردها' : 'قرض و طلب'}</button></div>`;
  if (cv === 'work') return sw + loansHtml();
  if (pe !== null) {
    const p = pe === 'new' ? { tags: [] } : ppl.find(x => x.id === pe) || { tags: [] };
    if (pe !== 'new' && !pEditing) {
      const cars = Array.isArray(p.cars) ? p.cars : [], cards = contactCardList(p), phones = [p.phone, ...(Array.isArray(p.phones) ? p.phones : [])].filter(Boolean);
      return sw + `<div class="card"><div class="row"><b>پروندهٔ ${esc(p.name || '')}</b><button id="pedit">ویرایش</button></div>
        <div class="mut" style="margin-top:8px">${(p.tags || []).map(esc).join(' · ') || 'بدون برچسب'}</div>
        ${phones.length ? `<div style="margin-top:8px">تلفن: <span dir="ltr">${phones.map(esc).join('، ')}</span></div>` : ''}
        ${cards.length ? `<div style="margin-top:8px">شماره کارت: ${cards.map(c => `<div dir="ltr" style="text-align:right">${esc(c)}</div>`).join('')}</div>` : ''}
        ${featureOn('vehicle') && cars.length ? `<div style="margin-top:8px"><b>🚚 ماشین‌ها</b>${cars.map(c => `<div class="mut">${[c.plate, c.model, c.color, c.type].filter(Boolean).map(esc).join(' · ')}</div>`).join('')}</div>` : ''}
        ${p.note ? `<div style="margin-top:8px;white-space:pre-wrap">یادداشت: ${esc(p.note)}</div>` : ''}
        <button class="sec" id="pback" style="margin-top:10px">بازگشت به مخاطبین</button></div>${contactHistory(p)}`;
    }
    return sw + `<div class="card" id="pform"><b>${pe === 'new' ? 'مخاطب جدید' : 'پروندهٔ ' + esc(p.name)}</b>
      <input id="pn" placeholder="نام" value="${esc(p.name || '')}"><input id="pp" inputmode="tel" placeholder="تلفن" value="${esc(p.phone || '')}"><div class="mut">شماره کارت‌ها (هر شماره در یک خط)</div><textarea id="pcards" rows="2" inputmode="numeric" placeholder="شماره کارت">${esc((p.cards || []).join('\n'))}</textarea>
      <div class="mut">برچسب‌ها (چندتایی)</div><div class="row" style="flex-wrap:wrap;gap:6px">${ptags().map(t => `<button class="ptg ${(p.tags || []).includes(t) ? '' : 'sec'}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div id="pcars" data-feature-section="vehicle" style="${(p.tags || []).includes('راننده') ? '' : 'display:none'}"><div class="mut">🚚 ماشین‌ها</div><div id="cl">${(p.cars || []).map(carRow).join('')}</div><button class="sec cadd">＋ ماشین</button></div>
      <input id="pnt" placeholder="برچسب تازه (نوشتن و Enter)"><textarea id="pno" rows="3" placeholder="یادداشت">${esc(p.note || '')}</textarea>
      <div class="row"><button id="psv">ذخیره</button><button class="sec" id="pcn">بستن</button>${pe === 'new' ? '' : '<button class="sec" id="pdl">🗑 حذف</button>'}</div></div>${pe === 'new' ? '' : contactHistory(p)}`;
  }
  const q = pfa(pq).trim(), L = ppl.filter(p => (!pf || (p.tags || []).includes(pf)) && (!q || (p.name + ' ' + (p.phone || '') + ' ' + contactCardList(p).join(' ')).includes(q)));
  return sw + (proposals.length ? `<div class="card"><b>🔎 موارد نیازمند بررسی (${proposals.length.toLocaleString('fa-IR')})</b><div class="mut">تشابه نام یا شماره مشترک پیدا شد؛ خودکار ادغام نمی‌شود.</div>${proposals.map((x, i) => `<div style="margin-top:12px"><b>${esc(x.f.name)}</b><div class="mut">${x.f.card ? 'کارت: ' + esc(x.f.card) : 'تلفن: ' + esc(x.f.phone)} · ${esc(x.f.role)}</div><select class="pmatch" data-index="${i}"><option value="">انتخاب پرونده…</option>${x.options.map(p => `<option value="${p.id}">${esc(p.name)} · ${esc(p.phone || contactCardList(p).join('، ') || 'بدون شماره')}</option>`).join('')}<option value="new">شخص جدید و جدا</option></select><button class="pmatchsave" data-index="${i}">تأیید انتخاب</button></div>`).join('')}</div>` : '') + `<div class="card"><div class="row"><b>مخاطبین (${ppl.length.toLocaleString('fa-IR')})</b><button id="pnew">＋ جدید</button></div>
    <input id="pq" placeholder="جستجوی نام، تلفن یا کارت" value="${esc(pq)}">
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px"><button class="pfl ${pf ? 'sec' : ''}" data-t="">همه</button>${ptags().map(t => `<button class="pfl ${pf === t ? '' : 'sec'}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
    ${L.map(p => `<div class="card pc" data-pid="${p.id}"><b>${esc(p.name)}</b> <span class="mut" dir="ltr">${esc(p.phone || '')}</span><div class="mut">${(p.tags || []).map(esc).join(' · ')}</div>${(featureOn('vehicle') ? (p.cars || []) : []).map(c => `<div class="mut">🚚 ${[c.plate, c.model, c.color, c.type].filter(Boolean).map(esc).join(' · ')}</div>`).join('')}${p.note ? `<div class="mut">${esc(p.note)}</div>` : ''}</div>`).join('') || '<div class="mut" style="padding:12px">مخاطبی نیست.</div>'}`;
}
const carRow = c => `<div class="crow row" style="flex-wrap:wrap;gap:4px;margin:6px 0;border-bottom:1px solid #eee;padding-bottom:6px"><input class="cp" placeholder="پلاک" value="${esc(c.plate || '')}"><input class="cm" list="car-model-list" placeholder="مدل" value="${esc(c.model || '')}"><datalist id="car-model-list">${carModels().map(m => `<option value="${esc(m)}">`).join('')}</datalist><input class="cc" placeholder="رنگ" value="${esc(c.color || '')}"><input class="ct" placeholder="نوع (کامیون، وانت…)" value="${esc(c.type || '')}"><button class="sec cdel">✕</button></div>`;
const pRead = () => ({ cars: [...document.querySelectorAll('#cl .crow')].map(r => ({ plate: pfa(r.querySelector('.cp').value.trim()), model: r.querySelector('.cm').value.trim(), color: r.querySelector('.cc').value.trim(), type: r.querySelector('.ct').value.trim() })).filter(c => c.plate || c.model || c.color || c.type), name: $('#pn').value.trim(), phone: pfa($('#pp').value.trim()), cards: $('#pcards').value.split(/\n/).map(idDigits).filter(Boolean), note: $('#pno').value.trim(), tags: [...document.querySelectorAll('#pform .ptg:not(.sec)')].map(b => b.dataset.t) });
document.addEventListener('click', e => {
  if (tab !== 'contacts') return;
  const g = s => e.target.closest(s);
  if (g('.pmatchsave')) {
    ppl = load('ppl', []); const proposals = reconcileContacts(), i = +g('.pmatchsave').dataset.index, item = proposals[i];
    const select = document.querySelector('.pmatch[data-index="' + i + '"]'); if (!item || !select || !select.value) { alert('ابتدا پرونده را انتخاب کن'); return; }
    const f = item.f, chosen = select.value;
    if (!confirm(chosen === 'new' ? 'این شخص به عنوان پرونده‌ای جدا ثبت شود؟' : 'این مورد به پرونده انتخاب‌شده وصل شود؟')) return;
    let person = chosen === 'new' ? null : item.options.find(p => String(p.id) === chosen);
    if (chosen !== 'new' && !person) { alert('پرونده پیدا نشد؛ دوباره تلاش کن'); return; }
    if (!person) { person = { id: Date.now() + Math.random(), name: f.name, phone: '', cards: [], tags: [], cars: [], note: '', links: [] }; ppl.push(person); }
    attachFact(person, f, true); savePpl(); render(); return;
  }
  if (g('[data-cv]')) { cv = g('[data-cv]').dataset.cv; pe = null; render(); return; }
  if (g('#pnew')) { pe = 'new'; pEditing = true; render(); return; }
  if (g('#pedit')) { pEditing = true; render(); return; }
  if (g('#pback')) { pe = null; pEditing = false; render(); return; }
  if (g('#pcn')) { if (pe === 'new') { if (Object.values(pRead()).some(v => Array.isArray(v) ? v.length : !!v) && !confirm('اطلاعات ذخیره نشده است. فرم بسته شود؟')) return; pe = null; } else { const old = ppl.find(x => x.id === pe), d = pRead(); if (old && JSON.stringify({name:old.name || '',phone:old.phone || '',cards:old.cards || [],tags:old.tags || [],cars:old.cars || [],note:old.note || ''}) !== JSON.stringify({name:d.name,phone:d.phone,cards:d.cards,tags:d.tags,cars:d.cars,note:d.note}) && !confirm('تغییرات ذخیره نشده است. ویرایش بسته شود؟')) return; } pEditing = false; render(); return; }
  if (g('.pfl')) { pf = g('.pfl').dataset.t; render(); return; }
  if (g('.cadd')) { $('#cl').insertAdjacentHTML('beforeend', carRow({ model: carModels().includes('اسکانیا') ? 'اسکانیا' : (carModels()[0] || '') })); return; }
  if (g('.cdel')) { g('.crow').remove(); return; }
  if (g('.ptg')) { g('.ptg').classList.toggle('sec'); const dr = [...document.querySelectorAll('#pform .ptg:not(.sec)')].some(b => b.dataset.t === 'راننده'); $('#pcars').style.display = dr ? '' : 'none'; return; }
  if (g('.pc')) { pe = +g('.pc').dataset.pid; pEditing = false; render(); return; }
  if (g('#pdl')) { if (confirm('این مخاطب حذف شود؟')) { const old = ppl.find(x => x.id === pe); const ignored = new Set(load('pplIgnored', [])); (old?.links || []).forEach(k => ignored.add(k)); localStorage.setItem('pplIgnored', JSON.stringify([...ignored])); ppl = ppl.filter(x => x.id !== pe); savePpl(); pe = null; render(); } return; }
  if (g('#psv')) {
    const d = pRead(); if (!d.name) { alert('نام را بنویس'); return; } if (d.cards.some(x => x.length !== 16)) { alert('هر شماره کارت باید ۱۶ رقم باشد'); return; } if (pe !== 'new') { const old = ppl.find(x => x.id === pe); if (old && JSON.stringify({name:old.name || '',phone:old.phone || '',cards:old.cards || [],tags:old.tags || [],cars:old.cars || [],note:old.note || ''}) !== JSON.stringify({name:d.name,phone:d.phone,cards:d.cards,tags:d.tags,cars:d.cars,note:d.note}) && !confirm('مشخصات مخاطب تغییر کرده است. ذخیره شود؟')) return; }
    if (pe === 'new') { if (d.phone && ppl.some(x => x.phone === d.phone)) { alert('این تلفن قبلاً ثبت شده'); return; } ppl.push({ id: Date.now(), ...d }); }
    else Object.assign(ppl.find(x => x.id === pe), d);
    if (pe === 'new') pe = ppl[ppl.length - 1].id; savePpl(); pEditing = false; render();
  }
});
document.addEventListener('input', e => { if (e.target.id === 'pq') { pq = e.target.value; const p = e.target.selectionStart; render(); const i = $('#pq'); if (i) { i.focus(); i.setSelectionRange(p, p); } } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pnt') { e.preventDefault(); const v = e.target.value.trim(); if (!v) return; const buttons = [...document.querySelectorAll('#pform .ptg')]; let b = buttons.find(x => x.dataset.t === v); if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'ptg'; b.dataset.t = v; b.textContent = v; buttons[0].parentElement.appendChild(b); } else b.classList.remove('sec'); if (v === 'راننده') $('#pcars').style.display = ''; e.target.value = ''; } });
