const $ = s => document.querySelector(s);
const CATS = ['خوراک', 'رستوران', 'حمل‌ونقل', 'خرید', 'قبض', 'سلامت', 'تفریح', 'اقساط', 'هدیه', 'سایر'];
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let tx = load('tx', []);
let accounts = load('accounts', { '34000': 'ملی', '481670002776322001': 'قرض‌الحسنه مهر' });
const save = () => { localStorage.setItem('tx', JSON.stringify(tx)); localStorage.setItem('accounts', JSON.stringify(accounts)); };
const toman = r => Math.round(r / 10).toLocaleString('fa-IR');
const accName = a => accounts[a] || (a ? '…' + a.slice(-4) : 'نامشخص');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let log = load('log', []);
const saveLog = () => localStorage.setItem('log', JSON.stringify(log.slice(0, 100)));
let banner = '';
let tab = 'home', month = null;

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
  const dup = tx.find(t => t.account === p.account && t.amount === p.amount && t.balance === p.balance && t.date === p.date);
  if (dup) return { ok: false, msg: 'تکراری بود' };
  const t = { id: Date.now() + Math.random(), bank: p.bank, account: p.account, type: p.type, amount: p.amount, balance: p.balance, date: p.date, desc: '', cat: '', pending: true };
  tx.unshift(t); save();
  return { ok: true, t };
}

function handleUrl() {
  const q = new URLSearchParams(location.search);
  const sms = q.get('sms');
  if (location.search) {
    history.replaceState({}, '', location.pathname);
    if (sms) {
      const r = addSms(sms);
      banner = r.ok ? '✅ پیامک جدید ثبت شد؛ پایین بنویس بابت چی بود.' : '⚠️ ' + r.msg + ' (در تنظیمات ← پیامک‌های دریافتی ببین)';
    } else {
      log.unshift({ at: Date.now(), raw: '', ok: false, msg: 'متن پیامک خالی رسید' }); saveLog();
      banner = '⚠️ پیامک خالی رسید. اگر متن را کپی کرده‌ای: <button id="clip">چسباندن از کلیپ‌بورد</button>';
    }
  }
}

function setDesc(id, desc, cat) {
  const t = tx.find(x => x.id === id);
  t.desc = desc; t.cat = cat || t.cat || 'سایر'; t.pending = false; save(); render();
}

function pendingCard(t) {
  const debit = t.type === 'debit';
  return `<div class="card" data-id="${t.id}">
    <div><b class="${debit ? 'red' : 'grn'}">${toman(t.amount)} تومان ${debit ? 'کسر شد' : 'واریز شد'}</b></div>
    <div class="mut">${esc(accName(t.account))} · ${esc(t.date)}</div>
    <div>${debit ? 'برای چی بود؟' : 'از طرف کی / بابت چی؟'}</div>
    <input class="d" placeholder="مثلاً: نان و ماست">
    ${debit ? `<div class="chips">${CATS.map(c => `<button class="chip sec" data-c="${c}">${c}</button>`).join('')}</div>` : ''}
    <div class="row"><button class="ok">ذخیره</button><button class="sec skip">بعداً</button><button class="sec del">حذف</button></div>
  </div>`;
}

function monthOf(t) { return t.date.slice(0, 7); }

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  const el = $('#app');
  if (tab === 'home' || tab === 'report') {
    el.innerHTML = tab === 'home' ? homeHtml() : reportHtml();
    $('#m') && ($('#m').onchange = e => { month = e.target.value; render(); });
  } else if (tab === 'add') {
    el.innerHTML = `
      <div class="card"><b>چسباندن پیامک</b>
        <textarea id="sms" rows="5" placeholder="متن پیامک بانکی را اینجا Paste کنید"></textarea>
        <button id="go">تشخیص و افزودن</button><div id="msg" class="mut"></div></div>
      <div class="card"><b>ثبت دستی (مثلاً بلو)</b>
        <input id="ma" type="number" inputmode="numeric" placeholder="مبلغ به تومان">
        <input id="md" placeholder="بابت چی؟">
        <select id="mc">${CATS.map(c => `<option>${c}</option>`).join('')}</select>
        <select id="mt"><option value="debit">هزینه</option><option value="credit">واریز</option></select>
        <input id="mac" placeholder="نام حساب" value="بلو">
        <button id="mg">ثبت</button></div>`;
    $('#go').onclick = () => { const r = addSms($('#sms').value); $('#msg').textContent = r.ok ? 'اضافه شد ✅' : r.msg; if (r.ok) { $('#sms').value = ''; } };
    $('#mg').onclick = () => {
      const a = +$('#ma').value; if (!a) return;
      const n = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = t => n.find(x => x.type === t).value;
      const acc = $('#mac').value || 'دستی';
      if (!Object.values(accounts).includes(acc)) accounts['manual:' + acc] = acc;
      const key = Object.keys(accounts).find(k => accounts[k] === acc);
      tx.unshift({ id: Date.now(), bank: acc, account: key, type: $('#mt').value, amount: a * 10, balance: null, date: `${g('year')}/${g('month')}/${g('day')} ${g('hour')}:${g('minute')}`, desc: $('#md').value, cat: $('#mc').value, pending: false });
      save(); tab = 'home'; render();
    };
  } else {
    el.innerHTML = `
      <div class="card"><b>نام حساب‌ها</b>
        ${Object.entries(accounts).map(([k, v]) => `<div class="mut" style="margin-top:8px">${esc(k)}</div><input data-k="${esc(k)}" class="an" value="${esc(v)}">`).join('')}
        <button id="sa">ذخیره نام‌ها</button></div>
      <div class="card"><b>پشتیبان‌گیری</b>
        <div class="mut">اگر مرورگر داده را پاک کند، اطلاعات از بین می‌رود؛ پشتیبان بگیرید.</div>
        <div class="row" style="margin-top:8px"><button id="ex">خروجی (کپی)</button><button class="sec" id="im">بازیابی</button></div>
        <textarea id="bk" rows="4" placeholder="برای بازیابی، متن پشتیبان را اینجا بچسبانید"></textarea></div>`;
    el.insertAdjacentHTML('beforeend', `<div class="card"><b>پیامک‌های دریافتی (${log.length.toLocaleString('fa-IR')})</b>
      <div class="mut">هر پیامکی که به برنامه رسیده اینجاست، حتی ردشده‌ها.</div>
      ${log.slice(0, 30).map((l, i) => `<div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px"><div class="mut">${new Date(l.at).toLocaleString('fa-IR')} · ${esc(l.msg)}</div><div style="font-size:13px;white-space:pre-wrap">${esc(l.raw.slice(0, 200))}</div>${l.ok ? '' : l.raw ? `<button class="sec retry" data-i="${i}">تلاش دوباره</button>` : ''}</div>`).join('')}</div>`);
    document.querySelectorAll('.retry').forEach(b => b.onclick = () => { const r = addSms0(log[+b.dataset.i].raw); if (r.ok) { log[+b.dataset.i].ok = true; log[+b.dataset.i].msg = 'ثبت شد'; saveLog(); tab = 'home'; render(); } else alert(r.msg); });
    $('#sa').onclick = () => { document.querySelectorAll('.an').forEach(i => accounts[i.dataset.k] = i.value); save(); alert('ذخیره شد'); };
    $('#ex').onclick = async () => { const s = JSON.stringify({ tx, accounts }); $('#bk').value = s; try { await navigator.clipboard.writeText(s); alert('کپی شد'); } catch { $('#bk').select(); } };
    $('#im').onclick = () => { try { const d = JSON.parse($('#bk').value); tx = d.tx; accounts = d.accounts; save(); alert('بازیابی شد'); } catch { alert('متن نامعتبر است'); } };
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
function rowHtml(t) {
  return `<div class="card"><div class="row"><b>${esc(t.desc || '—')}</b><b class="${t.type === 'debit' ? 'red' : 'grn'}">${t.type === 'debit' ? '−' : '+'}${toman(t.amount)}</b></div>
  <div class="row" style="margin-top:6px"><span>${badge(t.account)}</span><span class="mut">${esc(t.cat)} · ${esc(t.date)}</span></div></div>`;
}
function homeHtml() {
  const bal = {};
  [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(t => { if (t.balance != null && !(t.account in bal)) bal[t.account] = t.balance; });
  const accs = Object.keys(bal).filter(isSel);
  const total = accs.reduce((s, a) => s + bal[a], 0);
  const cur = tx.map(monthOf).sort().pop();
  const mt = tx.filter(t => isSel(t.account) && monthOf(t) === cur);
  const spent = mt.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const got = mt.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const pend = tx.filter(t => t.pending && isSel(t.account));
  return `${banner ? `<div class="card">${banner}</div>` : ''}
  ${filterBar()}
  <div class="hero"><div style="opacity:.8">${!sel || sel.length > 1 ? 'مجموع موجودی' : 'موجودی'}</div><div class="big">${toman(total)} <small>تومان</small></div>
    ${cur ? `<div class="row" style="margin-top:12px"><span>هزینهٔ ${esc(cur)}: <b>${toman(spent)}</b></span><span>واریز: <b>${toman(got)}</b></span></div>` : ''}</div>
  ${accs.length > 1 || sel ? accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('') : accs.map(a => `<div class="card row"><span>${badge(a)}</span><b>${toman(bal[a])} تومان</b></div>`).join('')}
  ${!accs.length ? '<div class="card mut">هنوز تراکنشی نیست.</div>' : ''}
  ${pend.length ? `<h3>منتظر توضیح (${pend.length.toLocaleString('fa-IR')})</h3>` + pend.map(pendingCard).join('') : ''}
  <h3>آخرین‌ها</h3>${tx.filter(t => !t.pending && isSel(t.account)).slice(0, 15).map(rowHtml).join('') || '<div class="mut">—</div>'}`;
}
function reportHtml() {
  const base = tx.filter(t => isSel(t.account));
  const months = [...new Set(tx.map(monthOf))].sort().reverse();
  if (!month || !months.includes(month)) month = months[0];
  const list = base.filter(t => monthOf(t) === month);
  const out = list.filter(t => t.type === 'debit'), inn = list.filter(t => t.type === 'credit');
  const sum = a => a.reduce((s, t) => s + t.amount, 0);
  const by = (arr, f) => { const m = {}; arr.forEach(t => m[f(t)] = (m[f(t)] || 0) + t.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const cats = by(out, t => t.cat || 'بدون دسته');
  const tot = sum(out) || 1, mx = cats[0]?.[1] || 1;
  const accRows = allAccs().filter(isSel).map(a => {
    const l = list.filter(t => t.account === a);
    return { a, o: sum(l.filter(t => t.type === 'debit')), i: sum(l.filter(t => t.type === 'credit')) };
  }).filter(r => r.o || r.i);
  if (!months.length) return filterBar() + '<div class="card mut">داده‌ای نیست.</div>';
  return `${filterBar()}
  <select id="m">${months.map(m => `<option ${m === month ? 'selected' : ''}>${m}</option>`).join('')}</select>
  <div class="hero"><div style="opacity:.8">خرج این ماه</div><div class="big">${toman(sum(out))} <small>تومان</small></div>
    <div class="row" style="margin-top:12px"><span>واریز: <b>${toman(sum(inn))}</b></span><span>مانده: <b>${toman(sum(inn) - sum(out))}</b></span></div></div>
  <div class="card"><b>خرج به تفکیک دسته</b>${cats.map(([c, v]) => `<div style="margin-top:10px"><div class="row"><span>${esc(c)}</span><span>${toman(v)} <span class="mut">(${Math.round(v / tot * 100).toLocaleString('fa-IR')}٪)</span></span></div><div class="bar" style="width:${v / mx * 100}%"></div></div>`).join('') || '<div class="mut">خرجی نیست</div>'}</div>
  <div class="card"><b>به تفکیک حساب</b>${accRows.map(r => `<div style="margin-top:10px"><div>${badge(r.a)}</div><div class="row mut"><span>خرج: <b class="red">${toman(r.o)}</b></span><span>واریز: <b class="grn">${toman(r.i)}</b></span></div></div>`).join('') || '<div class="mut">—</div>'}</div>
  <h3>تراکنش‌ها</h3>${list.map(rowHtml).join('')}`;
}

document.addEventListener('click', async e => {
  if (e.target.id === 'clip') {
    try { const t = await navigator.clipboard.readText(); const r = addSms(t); banner = r.ok ? '✅ ثبت شد' : '⚠️ ' + r.msg; } catch { banner = '⚠️ دسترسی به کلیپ‌بورد نشد؛ از تب افزودن Paste کن.'; }
    render(); return;
  }
  const fa = e.target.closest('.fb [data-a]');
  if (fa) { const a = fa.dataset.a; if (a === '*') sel = null; else { sel = sel ? (sel.includes(a) ? sel.filter(x => x !== a) : [...sel, a]) : [a]; if (!sel.length) sel = null; } localStorage.setItem('sel', JSON.stringify(sel)); render(); return; }
  const nb = e.target.closest('nav button'); if (nb) { tab = nb.dataset.t; render(); return; }
  const card = e.target.closest('.card[data-id]'); if (!card) return;
  const id = +card.dataset.id;
  if (e.target.dataset.c) { card.dataset.cat = e.target.dataset.c; card.querySelectorAll('.chip').forEach(c => c.classList.toggle('sec', c !== e.target)); }
  if (e.target.classList.contains('ok')) setDesc(id, card.querySelector('.d').value, card.dataset.cat);
  if (e.target.classList.contains('skip')) card.remove();
  if (e.target.classList.contains('del')) { tx = tx.filter(t => t.id !== id); save(); render(); }
});

handleUrl();
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
