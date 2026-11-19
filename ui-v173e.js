'use strict';
const SHORTCUT_ICLOUD_URL = 'https://www.icloud.com/shortcuts/PASTE_HERE';
function searchNormalize173e(value) {
  return String(value == null ? '' : value).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,\s\u200c]/g,'').toLowerCase();
}
function searchMatches173e(fields, query) {
  const q = searchNormalize173e(query); return !q || fields.some(field => searchNormalize173e(field).includes(q));
}
function searchData173e(query, transactions, invoices) {
  const expenses = transactions.filter(t => !t.ghost && t.type === 'debit' && searchMatches173e([t.desc,t.note,t.person,t.seller,t.customer,t.date,t.amount,Number(t.amount)/10],query));
  const matches = invoices.filter(i => searchMatches173e([i.number,i.proformaNumber,i.customer,i.ownerName,i.date,i.total,...(i.lines || []).map(line=>line.name)],query));
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
  section.innerHTML='<summary>اتصال پیامک / شرتکات آیفون</summary><div class="mut">نشانی: '+(shortcutUrl173e()?'script.google.com/…/exec':'ثبت نشده')+'</div><button type="button" id="shortcut-copy-173e">کپی آدرس اتصال برای شرتکات</button><div id="shortcut-status-173e" class="mut" aria-live="polite"></div><ol><li>کپی آدرس را بزن.</li><li>شرتکات را اضافه کن.</li><li>در Shortcuts، تب Automation، سه اتوماسیون پیامک بساز.</li><li>در هر کدام Run Shortcut را انتخاب کن و ورودی را Message بگذار.</li></ol>';
  container.appendChild(section);
  section.querySelector('#shortcut-copy-173e').onclick=async()=>{const url=shortcutUrl173e(),status=section.querySelector('#shortcut-status-173e'); if(!url){status.textContent='آدرس اتصال پیامک در این گوشی ثبت نشده است.';return;} status.textContent=await shortcutCopy173e(url,navigator.clipboard,document)?'کپی شد ✓':'کپی انجام نشد؛ دسترسی کلیپ‌بورد را بررسی کن.';};
  if (SHORTCUT_ICLOUD_URL) { const button=document.createElement('button'); button.type='button'; button.className='sec'; button.id='shortcut-open-173e'; button.textContent=window.INVENTORY_TEXT_FA.shortcutAddBtn198; button.onclick=()=>window.open(SHORTCUT_ICLOUD_URL, '_blank'); const help=document.createElement('div'); help.className='mut'; help.textContent=window.INVENTORY_TEXT_FA.shortcutAddHelp198; const status=section.querySelector('#shortcut-status-173e'); status.before(button,help); }
}
function searchClose173o() {
  const panel=document.getElementById('search-panel-173e'), app=document.getElementById('app');
  if(panel) panel.hidden=true; if(app) app.hidden=false;
  document.getElementById('section-search-173n')?.classList.remove('on');
  if(typeof navigationRender163==='function') navigationRender163();
}
document.addEventListener('DOMContentLoaded',()=>{
  const open=document.getElementById('search-173a'),panel=document.getElementById('search-panel-173e'),input=document.getElementById('search-input-173e'); let timer;
  if(!open||!panel||!input) return;
  const searchOpen173n=()=>{searchSetup173o(topic);input.value='';panel.hidden=false;document.getElementById('app').hidden=true;document.querySelectorAll('.section-nav-173n button').forEach(b=>b.classList.remove('on'));document.getElementById('section-search-173n').classList.add('on');searchRender173e();input.focus();};
  open.onclick=searchOpen173n;
  document.getElementById('section-search-173n').onclick=searchOpen173n;
  document.getElementById('search-filters-173o').addEventListener('change', searchRender173e);
  document.getElementById('search-reset-173o').onclick=()=>{document.querySelectorAll('#search-filters-173o select').forEach(s=>{s.value='';});searchRender173e();};
  document.getElementById('search-close-173e').onclick=()=>{searchClose173o();open.focus();};
  document.addEventListener('click',event=>{if(!panel.hidden && event.target.closest('#topics [data-topic], .section-nav-173n [data-t], .header-173a [data-t]')) searchClose173o();},true);
  document.getElementById('search-clear-173e').onclick=()=>{clearTimeout(timer);input.value='';searchRender173e();input.focus();};
  input.oninput=()=>{clearTimeout(timer);timer=setTimeout(searchRender173e,200);};
});
