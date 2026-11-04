const $ = s => document.querySelector(s);
const lsj = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) && v.length ? v : d; } catch { return d; } };
const CATS = lsj('cats', ['خوراک', 'رستوران', 'حمل‌ونقل', 'خرید', 'قبض', 'سلامت', 'تفریح', 'اقساط', 'هدیه', 'سایر']);
const INC = lsj('icats', ['فروش', 'مشتری', 'حقوق', 'سایر']);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let tx = load('tx', []);
let accounts = load('accounts', { '34000': 'ملی', '481670002776322001': 'قرض‌الحسنه مهر' });
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
let tab = 'home', month = null;

// انتقال بین حساب‌های خودم
const toMin = d => { const [x, h = '0:0'] = d.split(' '); const [y, m, dd] = x.split('/').map(Number); const [hh, mm] = h.split(':').map(Number); return ((y * 372 + m * 31 + dd) * 24 + hh) * 60 + mm; };
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
function matchTransfers() {
  let n = 0;
  const free = tx.filter(t => !t.xfer);
  free.filter(t => t.type === 'debit').forEach(d => {
    if (d.xfer) return;
    const c = free.find(x => !x.xfer && x.type === 'credit' && x.account !== d.account && x.amount === d.amount && Math.abs(toMin(x.date) - toMin(d.date)) <= 30);
    if (c) { markX(d, c); n++; }
  });
  if (n) save();
  return n;
}
// ورود پیامک
function addSms(raw) {
  const r = addSms0(raw);
  log.unshift({ at: Date.now(), raw: String(raw).slice(0, 600), ok: r.ok, msg: r.ok ? 'ثبت شد' : r.msg });
  saveLog();
  return r;
}
function addSms0(raw) {
  const p = parseSms(raw);
  if (!p) return { ok: false, msg: 'قالب پیامک شناخته نشد' };
  if (p.ignored) return { ok: false, msg: 'پیامک رمز بود؛ نادیده گرفته شد' };
  if (p.account && accounts[p.account] === undefined) { accounts[p.account] = /^\d{6,}$/.test(p.account) ? p.bank + ' …' + p.account.slice(-4) : p.bank; }
  const dup = tx.find(t => t.account === p.account && t.amount === p.amount && t.balance === p.balance && t.date === p.date);
  if (dup) return { ok: false, msg: 'تکراری بود' };
  const t = { id: Date.now() + Math.random(), bank: p.bank, account: p.account, type: p.type, amount: p.amount, balance: p.balance, date: p.date, desc: '', cat: '', pending: true, raw: String(raw).slice(0, 2000) };
  tx.unshift(t); save();
  const m = matchTransfers();
  return { ok: true, t, xfer: m };
}

function handleUrl() {
  const rawSearch = location.search;
  const q = new URLSearchParams(location.search);
  const sms = q.get('sms');
  if (location.search) {
    history.replaceState({}, '', location.pathname);
    if (sms) {
      const r = addSms(sms);
      banner = r.ok ? (r.t.xfer ? '🔁 انتقال بین حساب‌های خودت تشخیص داده شد.' : '✅ پیامک جدید ثبت شد؛ پایین بنویس بابت چی بود.') : '⚠️ ' + r.msg + ' (در تنظیمات ← پیامک‌های دریافتی ببین)';
    } else {
      log.unshift({ at: Date.now(), raw: 'URL: ' + rawSearch.slice(0, 300), ok: false, msg: 'متن پیامک خالی رسید' }); saveLog();
      banner = '⚠️ پیامک خالی رسید. اگر متن را کپی کرده‌ای: <button id="clip">چسباندن از کلیپ‌بورد</button>';
    }
  }
}

function setDesc(id, desc, cat, ex) {
  const t = tx.find(x => x.id === id);
  t.desc = desc; t.cat = cat || t.cat || 'سایر'; t.pending = false;
  if (ex) {
    if (ex.customer) t.customer = ex.customer; if (ex.service) t.service = ex.service;
    if (ex.remDate) { rem.push({ id: Date.now(), type: 'custom', title: desc || t.customer || 'یادآوری', date: ex.remDate, amount: Math.round(t.amount / 10), alerts: [3, 1], before: 3, count: 0, rep: '' }); saveRem(); }
  }
  save(); render();
}

function pendingCard(t) {
  const debit = t.type === 'debit';
  return `<div class="card" data-id="${t.id}">
    <div><b class="${debit ? 'red' : 'grn'}">${toman(t.amount)} تومان ${debit ? 'کسر شد' : 'واریز شد'}</b></div>
    <div class="mut">${esc(accName(t.account))} · ${esc(t.date)}</div>
    <div>${debit ? 'برای چی بود؟' : 'از طرف کی / بابت چی؟'}</div>
    <input class="d" list="dl" value="${esc(t.desc || '')}" placeholder="مثلاً: نان و ماست"><datalist id="dl"></datalist>
    <input class="p" list="pl" value="${esc(t.person || '')}" placeholder="اگر قرض است: نام شخص"><datalist id="pl">${people().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <div class="row">${(debit ? [['lent', 'قرض دادم'], ['payback', 'قرض پس دادم']] : [['repaid', 'پس گرفتم'], ['borrowed', 'قرض گرفتم']]).map(([k, l]) => `<button class="sec ln" data-k="${k}">${l}</button>`).join('')}</div>
    ${debit ? '' : `<input class="cu" value="${esc(t.customer || '')}" placeholder="نام مشتری / پرداخت‌کننده (اختیاری)"><input class="sv" value="${esc(t.service || '')}" placeholder="بابت چه خدمات/کالایی؟ (اختیاری)">`}
    <div class="chips">${(debit ? CATS : INC).map(c => `<button class="chip sec" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="mut">یادآوری (اختیاری): تاریخ</div><input class="rdt" type="date">
    <div class="row"><button class="ok">ذخیره</button>${t.desc ? '<button class="sec cx">انصراف</button>' : '<button class="sec skip">بعداً</button>'}<button class="sec xf">انتقال خودم</button><button class="sec del">حذف</button></div>
  </div>`;
}

const LOAN = { lent: ['قرض دادم', 1], payback: ['قرض پس دادم', 1], repaid: ['پس گرفتم', -1], borrowed: ['قرض گرفتم', -1] };
function people() { return [...new Set(tx.filter(t => t.person).map(t => t.person))]; }
function monthOf(t) { return t.date.slice(0, 7); }

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  const el = $('#app');
  if (tab === 'home' || tab === 'report') {
    el.innerHTML = tab === 'home' ? homeHtml() : reportHtml();
    $('#m') && ($('#m').onchange = e => { month = e.target.value; render(); });
  } else if (tab === 'rem') {
    el.innerHTML = remHtml(); remBind();
  } else if (tab === 'loans') {
    el.innerHTML = loansHtml();
  } else if (tab === 'add') {
    el.innerHTML = `
      <div class="card"><b>چسباندن پیامک</b>
        <textarea id="sms" rows="5" placeholder="متن پیامک بانکی را اینجا Paste کنید"></textarea>
        <button id="go">تشخیص و افزودن</button><div id="msg" class="mut"></div></div>
      <div class="card"><b>ثبت دستی (مثلاً بلو)</b>
        <input id="ma" type="number" inputmode="numeric" placeholder="مبلغ به تومان">
        <input id="md" placeholder="بابت چی؟">
        <select id="mc">${CATS.map(c => `<option>${c}</option>`).join('')}</select>
        <select id="mt"><option value="debit">هزینه</option><option value="credit">واریز</option><option value="xfer">انتقال بین حساب‌های خودم</option>${Object.entries(LOAN).map(([k, v]) => `<option value="loan:${k}">${v[0]}</option>`).join('')}</select>
        <input id="mp" list="pl2" placeholder="نام شخص (برای قرض)"><datalist id="pl2">${people().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        <div id="xs" class="hide"><div class="mut">از حساب:</div><select id="xf">${allAccs().map(a => `<option value="${esc(a)}">${esc(accName(a))}</option>`).join('')}</select><div class="mut">به حساب:</div><select id="xt">${allAccs().map(a => `<option value="${esc(a)}">${esc(accName(a))}</option>`).join('')}</select></div>
        <input id="mac" placeholder="نام حساب" value="بلو">
        <button id="mg">ثبت</button></div>`;
    $('#go').onclick = () => { const r = addSms($('#sms').value); $('#msg').textContent = r.ok ? 'اضافه شد ✅' : r.msg; if (r.ok) { $('#sms').value = ''; } };
    $('#mt').onchange = () => $('#xs').classList.toggle('hide', $('#mt').value !== 'xfer');
    $('#mg').onclick = () => {
      const a = +$('#ma').value; if (!a) return;
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
      tx.unshift({ id: Date.now(), bank: acc, account: key, type: lk ? (LOAN[lk][1] > 0 ? 'debit' : 'credit') : mv, amount: a * 10, balance: null, date: `${g('year')}/${g('month')}/${g('day')} ${g('hour')}:${g('minute')}`, desc: $('#md').value, cat: lk ? 'قرض' : $('#mc').value, pending: false, ...(lk ? { loan: lk, person: $('#mp').value.trim() } : {}) });
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
        <div class="mut">اگر مرورگر داده را پاک کند، اطلاعات از بین می‌رود؛ پشتیبان بگیرید.</div>
        <div class="row" style="margin-top:8px"><button id="ex">خروجی (کپی)</button><button id="bf">وارد کردن فایل بانک</button> <input type="file" id="bfi" accept=".xlsx" class="hide"> <button id="mgx" class="sec">ادغام (بدون حذف)</button> <button class="sec" id="im">بازیابی</button></div>
        <textarea id="bk" rows="4" placeholder="برای بازیابی، متن پشتیبان را اینجا بچسبانید"></textarea></div>`;
    el.insertAdjacentHTML('afterbegin', `<div class="card"><b>همگام‌سازی با Google Sheets</b>
      <div class="mut">${esc(syncMsg || (SYNC() ? '' : 'آدرس وصل نشده'))}</div>
      ${localStorage.getItem('syncLock') && SYNC() ? `<div class="mut">🔒 آدرس شیت یک بار وصل شد و قفل است (…${esc(SYNC().slice(-12))})</div><div class="row"><button id="sy">همگام‌سازی الان</button> <button class="sec" id="gs">باز کردن Google Sheet</button> <button class="sec" id="ul">تغییر آدرس</button></div>` : `<input id="su" placeholder="آدرس Web App (…/exec)" value="${esc(SYNC())}"><button id="sy">ذخیره و همگام‌سازی</button> <button class="sec" id="gs">باز کردن Google Sheet</button>`}</div>`);
    const labHtml = () => [['cats', 'برچسب‌های هزینه', CATS], ['icats', 'برچسب‌های درآمد', INC]].map(([k, n, L]) => `<div class="mut" style="margin-top:8px">${n}</div><div class="chips">${L.map((c, i) => `<button class="chip sec lbd" data-k="${k}" data-i="${i}">${esc(c)} ✕</button>`).join('')}</div><div class="row"><input class="lbn" data-k="${k}" placeholder="برچسب جدید"><button class="lba" data-k="${k}">افزودن</button></div>`).join('');
    el.insertAdjacentHTML('beforeend', `<div class="card" id="lbc"><b>برچسب‌ها</b><div class="mut">برای حذف روی برچسب بزن. در صفحهٔ پیامک جدید همین‌ها دیده می‌شوند. فقط روی همین دستگاه ذخیره می‌شود.</div><div id="lbx">${labHtml()}</div></div>`);
    $('#lbc').onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, L = k === 'cats' ? CATS : INC;
      if (b.classList.contains('lbd')) { if (L.length < 2) return; L.splice(+b.dataset.i, 1); }
      else if (b.classList.contains('lba')) { const v = $('#lbc .lbn[data-k="' + k + '"]').value.trim(); if (!v || L.includes(v)) return; L.push(v); }
      else return;
      localStorage.setItem(k, JSON.stringify(L)); $('#lbx').innerHTML = labHtml();
    };
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
      ${log.slice(0, 30).map((l, i) => `<div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><div class="mut">${new Date(l.at).toLocaleString('fa-IR')} · ${esc(l.msg)}</div><div style="font-size:13px;white-space:pre-wrap">${esc(l.raw.slice(0, 200))}</div>${l.ok ? '' : l.raw ? `<button class="sec retry" data-i="${i}">تلاش دوباره</button>` : ''}</div>`).join('')}</div>`);
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
          let cat = credit ? 'سایر' : (kind.includes('فروشگاه') ? 'خرید' : 'سایر');
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
    $('#sy').onclick = async () => { if ($('#su')) localStorage.setItem('sync', $('#su').value.trim()); pulled = false; syncMsg = 'در حال اتصال…'; render(); await pull(); render(); };
  }
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
function statusCard() {
  const l = log[0], lt = tx.reduce((m, t) => (t.id > (m?.id || 0) ? t : m), null);
  const ls = +localStorage.getItem('lastSync') || 0, dirty = localStorage.getItem('dirty');
  return `<div class="card"><b>آخرین وضعیت</b>
   <div class="mut" style="margin-top:6px">آخرین پیامک رسیده: ${l ? fmt(l.at) + ' · ' + (l.ok ? '✅ ' : '⚠️ ') + esc(l.msg) : 'هنوز نیامده'}</div>
   <div class="mut">آخرین تراکنش ثبت‌شده: ${lt ? fmt(lt.id) + ' · ' + esc(lt.desc || (lt.pending ? 'منتظر توضیح' : '—')) : '—'}</div>
   <div class="mut">شیت: ${!SYNC() ? 'وصل نیست' : dirty ? '⏳ تغییر ارسال‌نشده دارد' : ls ? '✅ آخرین ذخیره ' + fmt(ls) : 'هنوز چیزی ارسال نشده'}</div>
   <div class="mut">${esc(syncMsg)}</div></div>`; }
let lp = null;
function loansHtml() {
  const L = tx.filter(t => t.loan), bal = {};
  L.forEach(t => bal[t.person] = (bal[t.person] || 0) + LOAN[t.loan][1] * t.amount);
  const ppl = Object.keys(bal).sort((a, b) => Math.abs(bal[b]) - Math.abs(bal[a]));
  const cr = ppl.filter(p => bal[p] > 0).reduce((s, p) => s + bal[p], 0), db = ppl.filter(p => bal[p] < 0).reduce((s, p) => s - bal[p], 0);
  if (lp && bal[lp] !== undefined) {
    const l = ordTx(L.filter(t => t.person === lp));
    return `<button class="sec" id="lb">‹ بازگشت</button><div class="hero"><div style="opacity:.8">${esc(lp)}</div><div class="big">${toman(Math.abs(bal[lp]))} <small>تومان</small></div><div>${bal[lp] > 0 ? 'او به من بدهکار است' : bal[lp] < 0 ? 'من به او بدهکارم' : 'تسویه'}</div></div>${ordBar()}${l.map(rowHtml).join('')}`;
  }
  return `<div class="hero"><div class="row"><span>طلب من: <b>${toman(cr)}</b></span><span>بدهی من: <b>${toman(db)}</b></span></div></div>
  ${ppl.map(p => `<div class="card row lp" data-p="${esc(p)}"><b>${esc(p)}</b><b class="${bal[p] > 0 ? 'grn' : bal[p] < 0 ? 'red' : 'mut'}">${bal[p] > 0 ? 'طلبکار ' : bal[p] < 0 ? 'بدهکار ' : 'تسویه '}${toman(Math.abs(bal[p]))}</b></div>`).join('') || '<div class="card mut">هنوز قرضی ثبت نشده. در «افزودن» یا روی پیامک، دکمهٔ قرض را بزن.</div>'}`;
}
function rowHtml(t) {
  return `<div class="card" data-id="${t.id}"><div class="row"><b>${t.xfer ? '🔁 ' : ''}${t.loan ? '🤝 ' + esc(LOAN[t.loan][0]) + ' · ' + esc(t.person) + ' — ' : ''}${esc(t.desc || '—')}</b><b class="${t.xfer ? 'mut' : t.type === 'debit' ? 'red' : 'grn'}">${t.type === 'debit' ? '−' : '+'}${toman(t.amount)}</b></div>
  <div class="row" style="margin-top:6px"><span>${badge(t.account)}</span><span class="mut">${esc(t.cat)} · ${esc(t.date)}</span></div>
  ${t.customer || t.service ? `<div class="mut" style="margin-top:6px">${t.customer ? 'مشتری: ' + esc(t.customer) : ''}${t.customer && t.service ? ' · ' : ''}${t.service ? 'خدمت: ' + esc(t.service) : ''}</div>` : ''}
  <div class="row" style="margin-top:6px"><button class="sec ed">ویرایش</button>${t.raw ? `<details><summary class="mut">متن پیامک</summary><div style="font-size:13px;white-space:pre-wrap">${esc(t.raw)}</div></details>` : ''}</div></div>`;
}
function homeHtml() {
  return remBanner() + homeHtml0();
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
  ${pend.length ? `<h3>منتظر توضیح (${pend.length.toLocaleString('fa-IR')})</h3>` + pend.map(pendingCard).join('') : ''}
  ${filterBar()}
  ${statusCard()}
  <div class="hero"><div style="opacity:.8">${!sel || sel.length > 1 ? 'مجموع موجودی' : 'موجودی'}</div><div class="big">${toman(total)} <small>تومان</small></div>
    ${cur ? `<div class="row" style="margin-top:12px"><span>هزینهٔ ${esc(cur)}: <b>${toman(spent)}</b></span><span>واریز: <b>${toman(got)}</b></span></div>` : ''}</div>
  ${accs.length > 1 || sel ? accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('') : accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('')}
  ${!accs.length ? '<div class="card mut">هنوز تراکنشی نیست.</div>' : ''}
  <h3>آخرین‌ها</h3>${ordBar()}${ordTx(tx.filter(t => !t.pending && isSel(t.account))).slice(0, 15).map(rowHtml).join('') || '<div class="mut">—</div>'}`;
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
function reportHtml() {
  const base = tx.filter(t => isSel(t.account));
  const months = [...new Set(tx.map(monthOf))].sort().reverse();
  if (!month || !months.includes(month)) month = months[0];
  const list = base.filter(t => monthOf(t) === month);
  const real = list.filter(t => !t.xfer && !t.loan);
  const loans = {}; tx.filter(t => t.loan && isSel(t.account)).forEach(t => loans[t.person] = (loans[t.person] || 0) + LOAN[t.loan][1] * t.amount);
  const days = new Set(real.filter(t => t.type === 'debit').map(t => t.date.slice(0, 10))).size || 1;
  const topD = Object.entries(real.filter(t => t.type === 'debit' && t.desc).reduce((m, t) => (m[t.desc] = (m[t.desc] || 0) + t.amount, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const out = real.filter(t => t.type === 'debit'), inn = real.filter(t => t.type === 'credit');
  const flows = {}; list.filter(t => t.xfer && t.type === 'debit').forEach(t => { const k = t.account + '>' + t.to; flows[k] = (flows[k] || 0) + t.amount; });
  const sum = a => a.reduce((s, t) => s + t.amount, 0);
  const by = (arr, f) => { const m = {}; arr.forEach(t => m[f(t)] = (m[f(t)] || 0) + t.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cats = by(out, t => t.cat || 'بدون دسته');
  const incBy = { cu: by(inn.filter(t => t.customer), t => t.customer), sv: by(inn.filter(t => t.service), t => t.service) };
  const tot = sum(out) || 1, mx = cats[0]?.[1] || 1;
  const accRows = allAccs().filter(isSel).map(a => {
    const l = list.filter(t => t.account === a);
    return { a, o: sum(l.filter(t => t.type === 'debit' && !t.xfer)), i: sum(l.filter(t => t.type === 'credit' && !t.xfer)), xo: sum(l.filter(t => t.type === 'debit' && t.xfer)), xi: sum(l.filter(t => t.type === 'credit' && t.xfer)) };
  }).filter(r => r.o || r.i || r.xo || r.xi);
  if (!months.length) return filterBar() + '<div class="card mut">داده‌ای نیست.</div>';
  return `${filterBar()}${trendHtml()}
  <select id="m">${months.map(m => `<option ${m === month ? 'selected' : ''}>${m}</option>`).join('')}</select>
  <div class="hero"><div style="opacity:.8">خرج این ماه</div><div class="big">${toman(sum(out))} <small>تومان</small></div>
    <div class="row" style="margin-top:12px"><span>واریز: <b>${toman(sum(inn))}</b></span><span>مانده: <b>${toman(sum(inn) - sum(out))}</b></span></div></div>
  <details class="card"><summary><b>میانگین خرج روزانه</b></summary><div>${toman(Math.round(sum(out) / days))} تومان <span class="mut">(${days.toLocaleString('fa-IR')} روز دارای خرج)</span></div></details>
  ${topD.length ? `<details class="card"><summary><b>بیشترین خرج‌ها</b></summary>${topD.map(([d, v]) => `<div class="row" style="margin-top:6px"><span>${esc(d)}</span><span>${toman(v)}</span></div>`).join('')}</details>` : ''}
  ${Object.keys(loans).length ? `<details class="card"><summary><b>🤝 قرض‌ها (کل زمان)</b></summary>${Object.entries(loans).map(([p, v]) => `<div class="row" style="margin-top:8px"><span>${esc(p)}</span><b class="${v > 0 ? 'grn' : v < 0 ? 'red' : 'mut'}">${v > 0 ? 'بدهکار به من: ' : v < 0 ? 'من بدهکارم: ' : 'تسویه '}${v ? toman(Math.abs(v)) : ''}</b></div>`).join('')}</details>` : ''}
  <details class="card"><summary><b>خرج به تفکیک دسته</b></summary>${cats.map(([c, v]) => `<div style="margin-top:10px"><div class="row"><span>${esc(c)}</span><span>${toman(v)} <span class="mut">(${Math.round(v / tot * 100).toLocaleString('fa-IR')}٪)</span></span></div><div class="bar" style="width:${v / mx * 100}%"></div></div>`).join('') || '<div class="mut">خرجی نیست</div>'}</details>
  <details class="card"><summary><b>به تفکیک حساب</b></summary>${accRows.map(r => `<div style="margin-top:10px"><div>${badge(r.a)}</div><div class="row mut"><span>خرج: <b class="red">${toman(r.o)}</b></span><span>واریز: <b class="grn">${toman(r.i)}</b></span></div>${r.xo || r.xi ? `<div class="row mut"><span>انتقال رفته: ${toman(r.xo)}</span><span>انتقال آمده: ${toman(r.xi)}</span></div>` : ''}</div>`).join('') || '<div class="mut">—</div>'}</details>
  ${Object.keys(flows).length ? `<details class="card"><summary><b>جابه‌جایی بین حساب‌هایم 🔁</b></summary><div class="mut">در مجموع خرج یا درآمد حساب نمی‌شود.</div>${Object.entries(flows).map(([k, v]) => { const [f, t] = k.split('>'); return `<div class="row" style="margin-top:8px"><span>${badge(f)} ← ${badge(t)}</span><b>${toman(v)}</b></div>`; }).join('')}</details>` : ''}
  ${incBy.cu.length ? `<details class="card"><summary><b>💰 درآمد به تفکیک مشتری</b></summary>${incBy.cu.map(([c, v]) => `<div class="row" style="margin-top:6px"><span>${esc(c)}</span><b class="grn">${toman(v)}</b></div>`).join('')}</details>` : ''}
  ${incBy.sv.length ? `<details class="card"><summary><b>🔧 درآمد به تفکیک خدمت</b></summary>${incBy.sv.map(([c, v]) => `<div class="row" style="margin-top:6px"><span>${esc(c)}</span><b class="grn">${toman(v)}</b></div>`).join('')}</details>` : ''}
  <details class="card"><summary><b>🔍 جستجوی مشتری / خدمت</b></summary><input id="cq" placeholder="نام مشتری، خدمت یا شرح..."><div id="cqr"></div></details>
  <h3>تراکنش‌ها</h3>${ordBar()}${ordTx(list).map(rowHtml).join('')}`;
}

document.addEventListener('click', async e => {
  const lpc = e.target.closest('.lp'); if (lpc) { lp = lpc.dataset.p; render(); return; }
  if (e.target.id === 'lb') { lp = null; render(); return; }
  const ob = e.target.closest('.ordb'); if (ob) { ord = ob.dataset.o; localStorage.setItem('ord', ord); render(); return; }
  if (e.target.id === 'gs') { const u = localStorage.getItem('sheetUrl'); if (u) window.open(u, '_blank'); else alert('هنوز آدرس شیت دریافت نشده. اول «ذخیره و همگام‌سازی» را بزن (و Code.gs نسخهٔ جدید را Deploy کن).'); return; }
  if (e.target.id === 'clip') {
    try { const t = await navigator.clipboard.readText(); const r = addSms(t); banner = r.ok ? '✅ ثبت شد' : '⚠️ ' + r.msg; } catch { banner = '⚠️ دسترسی به کلیپ‌بورد نشد؛ از تب افزودن Paste کن.'; }
    render(); return;
  }
  const fa = e.target.closest('.fb [data-a]');
  if (fa) { const a = fa.dataset.a; if (a === '*') sel = null; else { sel = sel ? (sel.includes(a) ? sel.filter(x => x !== a) : [...sel, a]) : [a]; if (!sel.length) sel = null; } localStorage.setItem('sel', JSON.stringify(sel)); render(); return; }
  const nb = e.target.closest('nav button'); if (nb) { tab = nb.dataset.t; lp = null; render(); return; }
  const card = e.target.closest('.card[data-id]'); if (!card) return;
  const id = +card.dataset.id;
  if (e.target.dataset.c) { card.dataset.cat = e.target.dataset.c; card.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === e.target)); const seen = new Set(); card.querySelector('datalist').innerHTML = [...tx].reverse().filter(x => x.cat === e.target.dataset.c && x.desc && !seen.has(x.desc) && seen.add(x.desc)).slice(0, 15).map(x => `<option value="${esc(x.desc)}">`).join(''); }
  if (e.target.classList.contains('ed')) { const t = tx.find(x => x.id === id); card.outerHTML = pendingCard(t); return; }
  if (e.target.classList.contains('ln')) { const p = card.querySelector('.p').value.trim(); if (!p) { alert('نام شخص را بنویس'); return; } const t = tx.find(x => x.id === id), k = e.target.dataset.k; t.loan = k; t.person = p; t.cat = 'قرض'; t.desc = card.querySelector('.d').value || LOAN[k][0]; t.xfer = false; t.pending = false; save(); render(); return; }
  if (e.target.classList.contains('ok')) setDesc(id, card.querySelector('.d').value, card.dataset.cat, { customer: card.querySelector('.cu')?.value.trim(), service: card.querySelector('.sv')?.value.trim(), remDate: card.querySelector('.rdt').value });
  if (e.target.classList.contains('xf')) { const t = tx.find(x => x.id === id); t.xfer = true; t.cat = 'انتقال'; t.pending = false; t.desc = t.type === 'debit' ? 'انتقال به حساب دیگر' : 'انتقال از حساب دیگر'; save(); render(); return; }
  if (e.target.classList.contains('skip')) card.remove();
  if (e.target.classList.contains('cx')) { const t = tx.find(x => x.id === id); t.pending = false; save(); render(); return; }
  if (e.target.classList.contains('del')) { tx = tx.filter(t => t.id !== id); save(); render(); }
});

// ---- همگام‌سازی با Google Sheets ----
const DEFAULT_SYNC = '';
const SYNC = () => localStorage.getItem('sync') || localStorage.getItem('sync_bak') || DEFAULT_SYNC;
let pulled = false, syncMsg = '', pt = null;
function push() {
  if (!SYNC() || !pulled) return;
  clearTimeout(pt); pt = setTimeout(doPush, 1200);
}
async function doPush() {
  try {
    const r = await (await fetch(SYNC(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ tx, accounts, log: log.slice(0, 100) }) })).json();
    if (!r.ok) throw new Error(r.error);
    localStorage.removeItem('dirty'); localStorage.setItem('lastSync', Date.now()); syncMsg = '✅ ذخیره در شیت ' + new Date().toLocaleTimeString('fa-IR');
  } catch (e) { syncMsg = '⚠️ ارسال به شیت نشد؛ بعداً دوباره تلاش می‌شود'; }
}
async function pull() {
  if (!SYNC()) return;
  try {
    const rs = await fetch(SYNC()); const txt = await rs.text(); let d;
    try { d = JSON.parse(txt); } catch (_) { throw new Error(rs.status + ' ' + (/<title>(.*?)<\/title>/i.exec(txt)?.[1] || 'پاسخ JSON نیست (دسترسی Anyone نیست؟)')); }
    if (!d.ok) throw new Error(d.error || 'bad');
    if (d.sheetUrl) localStorage.setItem('sheetUrl', d.sheetUrl);
    const dirty = localStorage.getItem('dirty');
    const sid = new Set(d.tx.map(t => String(t.id))), lid = new Set(tx.map(t => String(t.id)));
    const localOnly = tx.filter(t => !sid.has(String(t.id)));
    const base = dirty ? [...tx, ...d.tx.filter(t => !lid.has(String(t.id)))] : [...d.tx, ...localOnly];
    tx = base.sort((a, b) => (a.date < b.date ? 1 : -1));
    accounts = { ...d.accounts, ...accounts }; JSON.parse(localStorage.getItem('delAcc') || '[]').forEach(k => { if (!tx.some(t => t.account === k)) delete accounts[k]; });
    const at = new Set(log.map(l => l.at)); log = [...log, ...d.log.filter(l => !at.has(l.at))].sort((a, b) => b.at - a.at).slice(0, 100);
    localStorage.setItem('tx', JSON.stringify(tx)); localStorage.setItem('accounts', JSON.stringify(accounts)); localStorage.setItem('log', JSON.stringify(log));
    if (localOnly.length || (tx.length && !d.tx.length)) localStorage.setItem('dirty', '1');
    pulled = true; syncMsg = '✅ متصل به شیت';
    localStorage.setItem('sync_bak', SYNC()); localStorage.setItem('syncLock', '1');
    matchTransfers();
    if (d.inbox && d.inbox.length) {
      d.inbox.forEach(i => addSms(i.raw)); localStorage.setItem('dirty', '1');
      await doPush();
      fetch(SYNC(), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ack: d.inbox.map(i => i.id) }) }).catch(() => {});
    }
    if (localStorage.getItem('dirty')) await doPush();
  } catch (e) { syncMsg = '⚠️ اتصال به شیت برقرار نشد: ' + (e.message || e); }
}
document.addEventListener('visibilitychange', async () => { if (document.visibilityState !== 'visible') return; if (!pulled) { await pull(); render(); } else if (localStorage.getItem('dirty')) push(); });
addEventListener('online', () => { if (!pulled) pull().then(render); else push(); });
navigator.storage?.persist?.();

const RT = { check: 'چک', inst: 'قسط', custom: 'سفارشی' };
let rem = JSON.parse(localStorage.getItem('rem') || '[]');
matchTransfers();
handleUrl();
render();
pull().then(render);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ===== یادآوری‌ها (فقط روی همین دستگاه) ===== */
const saveRem = () => localStorage.setItem('rem', JSON.stringify(rem));
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
  const L = dueList().filter(x => x.days <= (x.r.before || 3) && x.days >= -30 && !x.r.done);
  return L.length ? `<div class="card" style="border:2px solid #ef4444"><b>⏰ یادآوری</b>${L.map(x => `<div>${esc(x.r.title)} — ${x.days < 0 ? Math.abs(x.days).toLocaleString('fa-IR') + ' روز گذشته' : x.days === 0 ? 'امروز' : x.days.toLocaleString('fa-IR') + ' روز دیگر'}</div>`).join('')}</div>` : '';
}
function remHtml() {
  const L = dueList();
  return `<div class="card"><b>افزودن یادآوری</b>
    <select id="rt"><option value="check">ثبت/سررسید چک</option><option value="inst">قسط</option><option value="custom">سفارشی (شهریه، باشگاه…)</option></select>
    <input id="rn" placeholder="عنوان (مثلاً: چک ملت، قسط وام، شهریه)">
    <input id="ra" type="number" inputmode="numeric" placeholder="مبلغ به تومان (اختیاری)">
    <div class="mut" id="rdl">تاریخ سررسید:</div><input id="rd" type="date">
    <div class="mut">چند روز قبل هشدار؟ (چند عدد با ویرگول، مثلاً ۷,۳,۱)</div><input id="rb" value="7,3,1" dir="ltr">
    <div id="rc" class="hide"><input id="rk" type="number" inputmode="numeric" placeholder="تعداد کل اقساط (ماهانه)"></div>
    <select id="rr" class="hide"><option value="">تکرار ندارد</option><option value="m">هر ماه</option><option value="y">هر سال</option></select>
    <button id="rg">افزودن</button>
    <div class="mut" style="margin-top:8px">قسط یعنی بدهی که ماهانه و در مبلغ ثابت پرداخت می‌شود (وام، خرید اقساطی). برنامه هر ماه سررسید بعدی را نشان می‌دهد.</div></div>
  <div class="card"><b>لیست</b>${L.length ? L.map(x => `<div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><b>${RT[x.r.type]} · ${esc(x.r.title)}</b>${x.r.amount ? ' · ' + toman(x.r.amount * 10) + ' تومان' : ''}
    <div class="mut">${fa(x.d)} · ${x.r.done ? '✅ انجام شد' : x.days < 0 ? Math.abs(x.days).toLocaleString('fa-IR') + ' روز گذشته' : x.days.toLocaleString('fa-IR') + ' روز مانده'}${x.left != null ? ' · ' + x.left.toLocaleString('fa-IR') + ' قسط باقی‌مانده' : ''}</div>
    <div class="row"><button class="sec rdn" data-i="${x.r.id}">${x.r.done ? 'برگشت' : 'انجام شد'}</button><button class="sec rics" data-i="${x.r.id}">تقویم (هشدار)</button><button class="sec rdl2" data-i="${x.r.id}">حذف</button></div></div>`).join('') : '<div class="mut">چیزی ثبت نشده</div>'}</div>
  <div class="card"><div class="mut">اعلان خودکار در PWA آیفون بدون سرور مطمئن نیست؛ پس «تقویم (هشدار)» فایل تقویم با هشدارهای تعیین‌شده می‌سازد که آیفون خودش اعلان می‌دهد. همچنین موارد نزدیک بالای صفحهٔ خانه نشان داده می‌شوند. یادآوری‌ها فقط روی همین دستگاه ذخیره می‌شوند.</div></div>`;
}
function remBind() {
  const ty = () => { const t = $('#rt').value; $('#rc').classList.toggle('hide', t !== 'inst'); $('#rr').classList.toggle('hide', t !== 'custom'); $('#rdl').textContent = t === 'inst' ? 'تاریخ اولین قسط:' : 'تاریخ سررسید:'; };
  $('#rt').onchange = ty; ty();
  $('#rg').onclick = () => {
    const title = $('#rn').value.trim(), date = $('#rd').value; if (!title || !date) { alert('عنوان و تاریخ لازم است'); return; }
    const bs = $('#rb').value.split(/[,،]/).map(x => +x.trim()).filter(x => x >= 0);
    const t = $('#rt').value;
    rem.push({ id: Date.now(), type: t, title, date, amount: +$('#ra').value || 0, alerts: bs.length ? bs : [3], before: Math.max(...(bs.length ? bs : [3])), count: t === 'inst' ? +$('#rk').value || 1 : 0, rep: t === 'custom' ? $('#rr').value : '' });
    saveRem(); render();
  };
  document.querySelectorAll('.rdn').forEach(b => b.onclick = () => { const r = rem.find(x => x.id == b.dataset.i); r.done = !r.done; saveRem(); render(); });
  document.querySelectorAll('.rdl2').forEach(b => b.onclick = () => { if (confirm('حذف شود؟')) { rem = rem.filter(x => x.id != b.dataset.i); saveRem(); render(); } });
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
