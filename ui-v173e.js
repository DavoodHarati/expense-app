'use strict';
const SHORTCUT_ICLOUD_URL = '';
function searchNormalize173e(value) {
  return String(value == null ? '' : value).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,\s\u200c]/g,'').toLowerCase();
}
function searchMatches173e(fields, query) {
  const q = searchNormalize173e(query); return !q || fields.some(field => searchNormalize173e(field).includes(q));
}
function searchData173e(query, transactions, invoices) {
  const expenses = transactions.filter(t => !t.ghost && t.type === 'debit' && searchMatches173e([t.desc,t.note,t.person,t.seller,t.customer,t.date,t.amount,Number(t.amount)/10],query));
  const matches = invoices.filter(i => searchMatches173e([i.number,i.customer,i.ownerName,i.date,i.total,...(i.lines || []).map(line=>line.name)],query));
  return {expenses,invoices:matches.filter(i=>i.kind !== 'فروش'),sales:matches.filter(i=>i.kind === 'فروش')};
}
function searchRender173e() {
  const box = document.getElementById('search-results-173e'), input = document.getElementById('search-input-173e');
  if (!box || !input) return;
  const results = searchData173e(input.value,tx,invoiceList());
  const group = (title,rows,invoice) => !rows.length ? '' : '<div class="mut">' + title + ' · ' + rows.length.toLocaleString('fa-IR') + '</div>' + rows.slice(0,50).map(item=>'<div class="search-result-173e"><b>' + esc(invoice ? (item.customer || 'بدون نام') : (item.desc || item.person || item.seller || 'تراکنش')) + '</b><div class="mut">' + esc(item.date || '') + ' · ' + (invoice ? (Number(item.total)||0).toLocaleString('fa-IR') : toman(item.amount)) + ' تومان' + (invoice ? ' · شماره ' + esc(item.number || '—') : '') + '</div></div>').join('');
  box.innerHTML = group('هزینه‌ها',results.expenses,false) + group('فاکتورها',results.invoices,true) + group('فروش‌ها',results.sales,true) || '<div class="card mut">چیزی پیدا نشد</div>';
}
function invoiceDashboardData173e(items, transactions, month) {
  const valid = items.filter(i=>!i.proforma), months = new Map();
  for (const i of valid) { const key=String(i.date || '').slice(0,7); if (/^\d{4}\/\d{2}$/.test(key)) months.set(key,(months.get(key)||0)+(Number(i.total)||0)); }
  const pending = valid.filter(i => { const p=invoicePaymentStatus(i,transactions); return p.status === 'partial' || (i.payment?.method === 'unpaid' && p.status !== 'paid'); });
  return {monthly:valid.filter(i=>String(i.date||'').slice(0,7)===month).reduce((n,i)=>n+(Number(i.total)||0),0),debt:pending.reduce((n,i)=>n+Math.max(0,(Number(i.total)||0)-invoicePaymentStatus(i,transactions).amount),0),count:pending.length,months:[...months].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)};
}
function invoiceDashboard173e(items) {
  if (!Array.isArray(items)) return '<div class="card mut" role="status">در حال بارگذاری فاکتورها…</div>';
  const d=invoiceDashboardData173e(items,tx,invoiceDate().slice(0,7));
  return '<div class="dashboard-173e"><div class="dashboard-grid"><div>جمع ماه<b>'+d.monthly.toLocaleString('fa-IR')+' تومان</b></div><div>ماندهٔ طلب<b>'+d.debt.toLocaleString('fa-IR')+' تومان</b></div></div>'+(!items.length?'<div class="mut">هنوز فاکتوری ثبت نشده است.</div>':'')+'</div>';
}
function shortcutUrl173e() {
  const value = localStorage.getItem('legacyInboxUrl') || localStorage.getItem('sync_bak') || localStorage.getItem('sync') || '';
  if (!value) return '';
  try { return legacyInboxUrl(value); } catch (_) { return ''; }
}
async function shortcutCopy173e(value, clipboard, doc) {
  if (!value) return false;
  try { if (clipboard?.writeText) { await clipboard.writeText(value); return true; } } catch (_) {}
  const area=doc.createElement('textarea'); area.value=value; area.readOnly=true; area.style.cssText='position:fixed;left:-10000px;top:0;opacity:0'; doc.body.appendChild(area);
  try { area.focus(); area.select(); area.setSelectionRange(0,area.value.length); return doc.execCommand('copy') === true; } catch (_) { return false; } finally { area.remove(); }
}
function shortcutSettings173e(container) {
  const section=document.createElement('details'); section.className='card'; section.id='shortcut-settings-173e';
  section.innerHTML='<summary>اتصال پیامک / شرتکات آیفون</summary><div class="mut">نشانی: '+(shortcutUrl173e()?'script.google.com/…/exec':'ثبت نشده')+'</div><button type="button" id="shortcut-copy-173e">کپی آدرس اتصال برای شرتکات</button> <button type="button" class="sec" id="shortcut-open-173e" '+(!SHORTCUT_ICLOUD_URL?'disabled':'')+'>افزودن شرتکات'+(!SHORTCUT_ICLOUD_URL?' · به‌زودی':'')+'</button><div id="shortcut-status-173e" class="mut" aria-live="polite"></div><ol><li>کپی آدرس را بزن.</li><li>شرتکات را اضافه کن.</li><li>در Shortcuts، تب Automation، سه اتوماسیون پیامک بساز.</li><li>در هر کدام Run Shortcut را انتخاب کن و ورودی را Message بگذار.</li></ol>';
  container.appendChild(section);
  section.querySelector('#shortcut-copy-173e').onclick=async()=>{const url=shortcutUrl173e(),status=section.querySelector('#shortcut-status-173e'); if(!url){status.textContent='آدرس اتصال پیامک در این گوشی ثبت نشده است.';return;} status.textContent=await shortcutCopy173e(url,navigator.clipboard,document)?'کپی شد ✓':'کپی انجام نشد؛ دسترسی کلیپ‌بورد را بررسی کن.';};
  section.querySelector('#shortcut-open-173e').onclick=()=>{if(SHORTCUT_ICLOUD_URL) window.open(SHORTCUT_ICLOUD_URL,'_blank','noopener');};
}
document.addEventListener('DOMContentLoaded',()=>{
  const open=document.getElementById('search-173a'),panel=document.getElementById('search-panel-173e'),input=document.getElementById('search-input-173e'); let timer;
  if(!open||!panel||!input) return;
  open.onclick=()=>{panel.hidden=false;searchRender173e();input.focus();};
  document.getElementById('search-close-173e').onclick=()=>{panel.hidden=true;open.focus();};
  document.getElementById('search-clear-173e').onclick=()=>{clearTimeout(timer);input.value='';searchRender173e();input.focus();};
  input.oninput=()=>{clearTimeout(timer);timer=setTimeout(searchRender173e,200);};
});
