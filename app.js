const $ = s => document.querySelector(s);
const CATS = ['خوراک', 'رستوران', 'حمل‌ونقل', 'خرید', 'قبض', 'سلامت', 'تفریح', 'اقساط', 'هدیه', 'سایر'];
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let tx = load('tx', []);
let accounts = load('accounts', { '34000': 'ملی', '481670002776322001': 'قرض‌الحسنه مهر' });
const save = () => { localStorage.setItem('tx', JSON.stringify(tx)); localStorage.setItem('accounts', JSON.stringify(accounts)); };
const toman = r => Math.round(r / 10).toLocaleString('fa-IR');
const accName = a => accounts[a] || (a ? '…' + a.slice(-4) : 'نامشخص');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let tab = 'home', month = null;

// ورود پیامک
function addSms(raw) {
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
  if (location.search) alert('دریافت شد: ' + decodeURIComponent(location.search).slice(0, 300));
  if (sms) {
    const r = addSms(sms);
    history.replaceState({}, '', location.pathname);
    if (!r.ok) alert(r.msg);
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
  if (tab === 'home') {
    const pend = tx.filter(t => t.pending);
    const balances = {};
    [...tx].sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(t => { if (t.balance != null && !(t.account in balances)) balances[t.account] = t.balance; });
    el.innerHTML = `
      ${Object.keys(balances).map(a => `<div class="card row"><span>${esc(accName(a))}</span><b>${toman(balances[a])} تومان</b></div>`).join('') || '<div class="card mut">هنوز تراکنشی نیست.</div>'}
      ${pend.length ? `<h3>منتظر توضیح (${pend.length.toLocaleString('fa-IR')})</h3>` + pend.map(pendingCard).join('') : ''}
      <h3>آخرین‌ها</h3>${tx.filter(t => !t.pending).slice(0, 15).map(rowHtml).join('')}`;
  } else if (tab === 'report') {
    const months = [...new Set(tx.map(monthOf))].sort().reverse();
    if (!month || !months.includes(month)) month = months[0];
    const list = tx.filter(t => monthOf(t) === month);
    const out = list.filter(t => t.type === 'debit'), inn = list.filter(t => t.type === 'credit');
    const sum = a => a.reduce((s, t) => s + t.amount, 0);
    const by = (arr, f) => { const m = {}; arr.forEach(t => m[f(t)] = (m[f(t)] || 0) + t.amount); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const cats = by(out, t => t.cat || 'بدون دسته'), accs = by(out, t => accName(t.account));
    const mx = cats[0]?.[1] || 1;
    el.innerHTML = months.length ? `
      <select id="m">${months.map(m => `<option ${m === month ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <div class="card"><div class="row"><span>هزینه</span><b class="red">${toman(sum(out))}</b></div>
        <div class="row"><span>درآمد/واریز</span><b class="grn">${toman(sum(inn))}</b></div></div>
      <div class="card"><b>بر اساس دسته</b>${cats.map(([c, v]) => `<div style="margin-top:8px"><div class="row"><span>${esc(c)}</span><span>${toman(v)}</span></div><div class="bar" style="width:${v / mx * 100}%"></div></div>`).join('')}</div>
      <div class="card"><b>بر اساس حساب</b>${accs.map(([c, v]) => `<div class="row"><span>${esc(c)}</span><span>${toman(v)}</span></div>`).join('')}</div>
      <h3>تراکنش‌ها</h3>${list.map(rowHtml).join('')}` : '<div class="card mut">داده‌ای نیست.</div>';
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
    $('#sa').onclick = () => { document.querySelectorAll('.an').forEach(i => accounts[i.dataset.k] = i.value); save(); alert('ذخیره شد'); };
    $('#ex').onclick = async () => { const s = JSON.stringify({ tx, accounts }); $('#bk').value = s; try { await navigator.clipboard.writeText(s); alert('کپی شد'); } catch { $('#bk').select(); } };
    $('#im').onclick = () => { try { const d = JSON.parse($('#bk').value); tx = d.tx; accounts = d.accounts; save(); alert('بازیابی شد'); } catch { alert('متن نامعتبر است'); } };
  }
}

function rowHtml(t) {
  return `<div class="card"><div class="row"><b>${esc(t.desc || '—')}</b><b class="${t.type === 'debit' ? 'red' : 'grn'}">${t.type === 'debit' ? '−' : '+'}${toman(t.amount)}</b></div>
  <div class="mut">${esc(t.cat)} · ${esc(accName(t.account))} · ${esc(t.date)}</div></div>`;
}

document.addEventListener('click', e => {
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
