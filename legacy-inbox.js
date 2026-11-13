let legacyInboxBusy = false;
let legacyInboxMessage = '';

function legacyInboxUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('نشانی شورتکات معتبر نیست.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(url.pathname)) throw new Error('نشانی کامل Web App شورتکات را وارد کن.');
  return url.href;
}

function legacyInboxShow(message) {
  legacyInboxMessage = message;
  const status = document.getElementById('legacy-inbox-status');
  if (status) status.textContent = message;
}

async function legacyInboxCheck(manual) {
  if (legacyInboxBusy) return;
  legacyInboxBusy = true;
  try {
    if (localStorage.getItem('legacySyncPaused') !== '1') throw new Error('ابتدا اتصال قدیمی را در این گوشی متوقف کن؛ نشانی شورتکات باقی می‌ماند.');
    const field = document.getElementById('legacy-inbox-url');
    const url = legacyInboxUrl(field ? field.value : localStorage.getItem('legacyInboxUrl') || localStorage.getItem('sync_bak') || localStorage.getItem('sync'));
    localStorage.setItem('legacyInboxUrl', url);
    if (manual) legacyInboxShow('در حال بررسی پیامک‌های شورتکات…');
    const response = await accountOwnerFetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) throw new Error('دریافت صندوق پیامک ناموفق بود (کد ' + response.status + ').');
    const data = await response.json();
    accountOwnerAssert();
    if (!data || data.ok !== true || !Array.isArray(data.inbox)) throw new Error('پاسخ اتصال قدیمی صندوق پیامک معتبر ندارد.');
    if (data.inbox.length > 5000) throw new Error('تعداد پیامک‌های صندوق زیاد است؛ بررسی دستی لازم است.');
    const seen = new Set(load('legacyInboxImported', []));
    const source = new URL(url).pathname.split('/')[3];
    const candidates = [];
    for (const item of data.inbox) {
      if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 200 || typeof item.raw !== 'string' || item.raw.length > 10000) continue;
      const key = source + ':' + item.id;
      if (seen.has(key)) continue;
      const parsed = parseSms(item.raw);
      if (!parsed || !parsed.ignored) { candidates.push({ key, raw: item.raw }); seen.add(key); }
    }
    if (!candidates.length) { if (manual) legacyInboxShow('پیامک بانکی جدید و قابل شناسایی در صندوق پیدا نشد.'); return; }
    if (manual && !confirm(candidates.length + ' پیامک بانکی بررسی‌نشده پیدا شد. برای نمایش در پرسش‌های برنامه وارد شوند؟')) { legacyInboxShow('ورود پیامک‌ها لغو شد.'); return; }
    let added = 0, duplicate = 0, review = 0, failed = 0;
    const imported = new Set(load('legacyInboxImported', []));
    for (const item of candidates) {
      if (imported.has(item.key)) continue;
      const result = addSms(item.raw);
      if (result.ok || result.review || result.msg === 'تکراری بود') {
        imported.add(item.key);
        localStorage.setItem('legacyInboxImported', JSON.stringify([...imported]));
        localStorage.setItem('dirty', '1');
        if (result.ok) added++; else if (result.review) review++; else duplicate++;
      } else failed++;
    }
    legacyInboxShow('✅ ' + added + ' پیامک برای بررسی اضافه شد؛ ' + duplicate + ' مورد تکراری بود.' + (review ? ' ' + review + ' پیامک ناشناخته در فهرست پیامک‌های دریافتی منتظر بررسی دستی است.' : '') + (failed ? ' ' + failed + ' مورد وارد نشد.' : ''));
    if (added && tab === 'home' && typeof directAutoCanApply === 'function' && directAutoCanApply()) render();
  } catch (error) {
    legacyInboxShow('⚠️ ' + (error.message || 'بررسی پیامک انجام نشد.'));
  } finally { legacyInboxBusy = false; }
}

function legacyInboxPrepare(container) {
  const url = localStorage.getItem('legacyInboxUrl') || localStorage.getItem('sync_bak') || localStorage.getItem('sync') || '';
  const enabled = localStorage.getItem('legacyInboxAuto') === '1';
  container.insertAdjacentHTML('beforeend', `<div class="card" id="legacy-inbox"><b>پیامک‌های شورتکات</b><div class="mut">صندوق اتصال قدیمی بررسی می‌شود و پیامک بانکی برای پرسش به برنامه اضافه می‌شود. پیامک رمز وارد نمی‌شود. دریافت خودکار را فقط روی یک گوشی روشن کن؛ برنامه باید باز باشد.</div><input id="legacy-inbox-url" type="url" dir="ltr" placeholder="نشانی Web App شورتکات" value="${esc(url)}"><button type="button" id="legacy-inbox-check">بررسی پیامک‌های شورتکات</button><label style="display:block;margin-top:10px"><input type="checkbox" id="legacy-inbox-auto" ${enabled ? 'checked' : ''}> دریافت خودکار پیامک در این گوشی</label><div class="mut" id="legacy-inbox-status" aria-live="polite">${esc(legacyInboxMessage)}</div></div>`);
  document.getElementById('legacy-inbox-check').onclick = () => legacyInboxCheck(true);
  document.getElementById('legacy-inbox-auto').onchange = event => {
    if (!event.target.checked) { localStorage.removeItem('legacyInboxAuto'); legacyInboxShow('دریافت خودکار پیامک متوقف شد.'); return; }
    try {
      if (localStorage.getItem('legacySyncPaused') !== '1') throw new Error('ابتدا اتصال قدیمی را در این گوشی متوقف کن.');
      localStorage.setItem('legacyInboxUrl', legacyInboxUrl(document.getElementById('legacy-inbox-url').value));
      localStorage.setItem('legacyInboxAuto', '1');
      legacyInboxShow('دریافت خودکار روی این گوشی روشن است.');
      legacyInboxCheck(false);
    } catch (error) { event.target.checked = false; legacyInboxShow('⚠️ ' + error.message); }
  };
}

setInterval(() => {
  if (document.visibilityState === 'visible' && localStorage.getItem('legacyInboxAuto') === '1') legacyInboxCheck(false);
}, 60000);
