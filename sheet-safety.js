'use strict';
const SHEET_REGISTRY_KEY = 'createdSheetsRegistry168';
function sheetRegistryRead() {
  try { const value = JSON.parse(localStorage.getItem(SHEET_REGISTRY_KEY) || '[]'); return Array.isArray(value) ? value.filter(x => x && /^[A-Za-z0-9_-]+$/.test(x.id || '') && typeof x.name === 'string') : []; } catch (_) { return []; }
}
function sheetRegistryRecord(id, name) {
  if (!/^[A-Za-z0-9_-]+$/.test(id || '')) throw new Error('شناسه شیت ساخته‌شده نامعتبر است');
  try {
    const rows = JSON.parse(localStorage.getItem(SHEET_REGISTRY_KEY) || '[]');
    if (!Array.isArray(rows)) throw new Error('invalid registry');
    if (!rows.some(x => x && x.id === id)) rows.push({ id, name: String(name || 'شیت ساخته‌شده'), createdAt: new Date().toISOString() });
    localStorage.setItem(SHEET_REGISTRY_KEY, JSON.stringify(rows));
  }
  catch (_) { alert('شیت ساخته شد اما ثبت فهرست در گوشی ممکن نبود. شناسه شیت را نگه دار: ' + id); }
  sheetRegistryRender();
}
function sheetRegistryRender() {
  const el = document.getElementById('sheet-registry-168'); if (!el) return;
  const rows = sheetRegistryRead();
  el.innerHTML = '<b>شیت‌های ساخته‌شده توسط برنامه</b>' + (rows.length ? rows.map(x => '<div class="mut">' + esc(x.name) + ' · <a target="_blank" rel="noopener noreferrer" href="https://docs.google.com/spreadsheets/d/' + encodeURIComponent(x.id) + '/edit">باز کردن شیت</a></div>').join('') : '<div class="mut">هنوز شیتی در این فهرست ثبت نشده است.</div>');
}
function sheetHasExistingConnection() {
  try { const easy = JSON.parse(localStorage.getItem('easySetupExperimentV1') || '{}'), direct = JSON.parse(localStorage.getItem('directSyncState') || '{}'); return !!(easy.sheetId || easy.mainUrl || direct.id || localStorage.getItem('sync') || localStorage.getItem('sync_bak') || localStorage.getItem('sheetUrl') || localStorage.getItem('hubSheet168')); } catch (_) { return true; }
}
function sheetConfirmCreate() {
  if (!sheetHasExistingConnection()) return Promise.resolve(true);
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    if (typeof dialog.showModal !== 'function') { alert('پنجره تأیید در این مرورگر پشتیبانی نمی‌شود؛ شیت جدید ساخته نشد.'); resolve(false); return; }
    dialog.innerHTML = '<p>شیت اصلی از قبل وصل است. مطمئنی شیت جدید بسازم؟ (اکثراً لازم نیست)</p><button type="button" data-choice="cancel">انصراف</button> <button type="button" data-choice="create">ساخت شیت جدید</button>';
    dialog.setAttribute('dir', 'rtl'); document.body.appendChild(dialog);
    let done = false;
    const finish = value => { if (done) return; done = true; dialog.close(); dialog.remove(); resolve(value); };
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
    dialog.addEventListener('click', event => { const button = event.target.closest('button'); if (button && button.dataset.choice) finish(button.dataset.choice === 'create'); });
    dialog.showModal(); dialog.querySelector('[data-choice="cancel"]').focus();
  });
}
