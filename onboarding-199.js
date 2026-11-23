'use strict';
(function (root) {
  var DONE_KEY = 'onboarding199Done';
  var PHONE_KEY = 'onboardingPhone199';
  var METHOD_KEY = 'onboardingMethod199';
  var STEP_KEY = 'onboardingStep199';
  var GOOGLE_KEY = 'onboardingGoogle199';
  var EXISTING_KEYS = ['dataOwner', 'tx', 'accounts', 'invoices', 'sync', 'sync_bak', 'noSync', 'easySetupExperimentV1', 'directSyncState', 'ppl', 'rem', 'log'];
  var STEPS = ['google', 'phone', 'method', 'start', 'platform', 'finish'];

  var overlay = null;
  var identityToken = '';
  var identityEmail = '';
  var googleBusy = false;
  var autoBusy = false;
  var selectedMethod = '';
  var googleError = '';
  var autoStatus = '';

  var CSS = [
    '#onboarding-199{position:fixed;inset:0;z-index:99998;background:linear-gradient(180deg,#f0fdfa,#f8fafc 42%,#f8fafc);color:#15352f;overflow:auto;padding:calc(env(safe-area-inset-top) + 16px) 14px calc(env(safe-area-inset-bottom) + 16px);direction:rtl;font-family:inherit}',
    '#onboarding-199 *{box-sizing:border-box}',
    '.onboarding-shell-199{max-width:560px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;gap:14px}',
    '.onboarding-head-199{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}',
    '.onboarding-head-199 strong{font-size:20px;color:#0f766e}',
    '.onboarding-step-chip-199{background:#e7f6ef;color:#155e4e;border-radius:999px;padding:6px 10px;font-size:12px;white-space:nowrap}',
    '.onboarding-progress-199{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden}',
    '.onboarding-progress-199 span{display:block;height:100%;background:#0f766e;border-radius:999px;transition:width .25s ease}',
    '#onboarding-199 h2{font-size:22px;margin:0 0 6px;color:#0f172a}',
    '#onboarding-199 p{line-height:1.9;margin:0 0 10px}',
    '.onboarding-content-199{flex:1}',
    '.onboarding-hero-199{width:76px;height:76px;border-radius:24px;background:#fff;border:1px solid #b9e8e1;display:grid;place-items:center;font-size:38px;box-shadow:0 8px 22px #0f766e1f;margin-bottom:12px}',
    '.onboarding-choice-grid-199{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}',
    '.onboarding-choice-199{min-height:96px;border:1px solid #b9e8e1;background:#fff;color:#15352f;border-radius:16px;padding:14px;text-align:right;display:flex;flex-direction:column;gap:6px;box-shadow:0 2px 8px #0f766e14}',
    '.onboarding-choice-199.selected{background:#0f766e;color:#fff;border-color:#0f766e}',
    '.onboarding-choice-199:disabled{opacity:.5}',
    '.onboarding-choice-199 strong{font-size:16px}',
    '.onboarding-choice-199 small{font-size:12px;line-height:1.7;color:inherit;opacity:.85}',
    '.onboarding-choice-icon-199{font-size:28px}',
    '.onboarding-primary-199{min-height:48px;width:100%;background:#0f766e;color:#fff;border-radius:14px;font-weight:700;font-size:16px;border:0}',
    '.onboarding-primary-199:disabled{opacity:.5}',
    '.onboarding-link-199{min-height:44px;background:transparent;color:#0f766e;text-decoration:underline;padding:8px;border:0}',
    '.onboarding-note-199{background:#fff7ed;border:1px solid #fed7aa;color:#7c2d12;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.8;margin:10px 0}',
    '.onboarding-note-199.ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}',
    '.onboarding-warning-199{background:#fef3c7;border:1px solid #fcd34d;color:#78350f;border-radius:12px;padding:10px 12px;font-weight:700;line-height:1.8;margin:10px 0}',
    '.onboarding-status-199{min-height:24px;background:#f1f5f9;border-radius:10px;padding:8px 10px;font-size:13px;color:#475569;margin:8px 0;line-height:1.7}',
    '.onboarding-status-199.ok{background:#ecfdf5;color:#065f46}',
    '.onboarding-summary-199{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:12px 0}',
    '.onboarding-summary-199>div{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px}',
    '.onboarding-summary-199 span{display:block;color:#64748b;font-size:12px}',
    '.onboarding-summary-199 b{display:block;margin-top:6px;font-size:16px;color:#0f766e}',
    '.onboarding-steps-199{display:flex;flex-direction:column;gap:12px;margin:12px 0}',
    '.onboarding-step-199{display:flex;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px}',
    '.onboarding-step-num-199{flex:none;width:30px;height:30px;border-radius:50%;background:#0f766e;color:#fff;display:grid;place-items:center;font-weight:700}',
    '.onboarding-step-199 strong{display:block;margin-bottom:4px;color:#0f172a}',
    '.onboarding-step-199 p{margin:0 0 8px;font-size:13px;color:#475569}',
    '.onboarding-art-svg-199{width:100%;max-width:200px;height:auto;display:block;margin:6px auto 0;background:#f8fafc;border-radius:12px}',
    '.onboarding-foot-199{position:sticky;bottom:0;display:flex;gap:10px;padding:10px 0 calc(10px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#f8fafc00,#f8fafc 30%)}',
    '.onboarding-foot-199 button{flex:1;min-height:48px;border-radius:14px}',
    '.onboarding-foot-199 button.sec{background:#e5e7eb;color:#334155;border:0}',
    '.onboarding-foot-199 button:disabled{opacity:.5}',
    'body.onboarding-active-199{overflow:hidden}',
    '@media (prefers-reduced-motion: reduce){#onboarding-199 *,#onboarding-199{transition:none!important;animation:none!important}}'
  ].join('');

  function text() {
    try { return root.INVENTORY_TEXT_FA && root.INVENTORY_TEXT_FA.onboarding199 ? root.INVENTORY_TEXT_FA.onboarding199 : {}; }
    catch (_) { return {}; }
  }
  function fmt(value, vars) {
    return String(value == null ? '' : value).replace(/\{(\w+)\}/g, function (_, key) {
      return vars && Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    });
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function store(storage) {
    if (storage && typeof storage.getItem === 'function') return storage;
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; }
  }
  function sGet(storage, key) {
    var target = store(storage);
    try { return target ? target.getItem(key) : null; } catch (_) { return null; }
  }
  function sSet(storage, key, value) {
    var target = store(storage);
    try { if (target) target.setItem(key, String(value)); } catch (_) {}
  }
  function sRemove(storage, key) {
    var target = store(storage);
    try { if (target) target.removeItem(key); } catch (_) {}
  }
  function normalizePhone(value) {
    var next = String(value == null ? '' : value).trim().toLowerCase();
    if (next === 'ios' || next === 'iphone' || next === 'آیفون') return 'ios';
    if (next === 'android' || next === 'اندروید') return 'android';
    return '';
  }
  function readPhone(storage) { return normalizePhone(sGet(storage, PHONE_KEY)); }
  function savePhone(value, storage) {
    var next = normalizePhone(value);
    if (!next) return '';
    sSet(storage, PHONE_KEY, next);
    return next;
  }
  function normalizeMethod(value) {
    var next = String(value == null ? '' : value).trim().toLowerCase();
    return next === 'auto' || next === 'manual' ? next : '';
  }
  function readMethod(storage) { return normalizeMethod(sGet(storage, METHOD_KEY)); }
  function saveMethod(value, storage) {
    var next = normalizeMethod(value);
    if (next) sSet(storage, METHOD_KEY, next);
    return next;
  }
  function readGoogle(storage) { return sGet(storage, GOOGLE_KEY) === '1'; }
  function saveGoogle(value, storage) {
    if (value) sSet(storage, GOOGLE_KEY, '1');
    else sSet(storage, GOOGLE_KEY, '0');
  }
  function readStep(storage) {
    var value = String(sGet(storage, STEP_KEY) || '');
    return STEPS.indexOf(value) >= 0 ? value : '';
  }
  function saveStep(value, storage) {
    var next = STEPS.indexOf(String(value || '')) >= 0 ? String(value) : 'google';
    sSet(storage, STEP_KEY, next);
    return next;
  }
  function valueExists(value) {
    var textValue = value == null ? '' : String(value).trim();
    return textValue !== '' && textValue !== '0' && textValue !== 'false' && textValue !== '[]' && textValue !== '{}';
  }
  function hasExistingUser(storage) {
    return EXISTING_KEYS.some(function (key) { return valueExists(sGet(storage, key)); });
  }
  function shouldShow(storage) {
    if (sGet(storage, DONE_KEY) === '1') return false;
    if (sGet(storage, STEP_KEY) != null && String(sGet(storage, STEP_KEY)).trim() !== '') return true;
    return !hasExistingUser(storage);
  }
  function markDone(storage) {
    sSet(storage, DONE_KEY, '1');
    sRemove(storage, STEP_KEY);
  }
  function readState(storage) {
    return {
      done: sGet(storage, DONE_KEY) === '1',
      phone: readPhone(storage),
      method: readMethod(storage),
      step: readStep(storage),
      google: readGoogle(storage)
    };
  }
  function currentIndex(storage) {
    var index = STEPS.indexOf(readStep(storage));
    return index >= 0 ? index : 0;
  }
  function stepTitle(step) {
    var t = text();
    var keys = { google: 'stepGoogle', phone: 'stepPhone', method: 'stepMethod', start: 'stepStart', platform: 'stepPlatform', finish: 'stepFinish' };
    return t[keys[step]] || '';
  }
  function shortcutUrl() {
    try { return typeof SHORTCUT_ICLOUD_URL === 'string' ? SHORTCUT_ICLOUD_URL : ''; }
    catch (_) { return ''; }
  }
  function hasConnection() {
    try { if (typeof easyWizardState === 'function' && easyWizardState().ready) return true; } catch (_) {}
    try { if (typeof SYNC === 'function' && SYNC()) return true; } catch (_) {}
    try { var direct = JSON.parse(sGet(null, 'directSyncState') || '{}'); if (direct && direct.id) return true; } catch (_) {}
    return false;
  }
  function connectionStatus() {
    var t = text();
    if (hasConnection()) return t.ready;
    if (readMethod() === 'manual' || sGet(null, 'noSync') === '1') return t.manual;
    return t.pending;
  }
  function summary() {
    var t = text();
    var phone = readPhone();
    return {
      google: readGoogle() ? t.connected : t.notConnected,
      phone: phone === 'ios' ? t.phoneIos : phone === 'android' ? t.phoneAndroid : t.notSelected,
      connection: connectionStatus()
    };
  }
  function activateEasy() {
    try {
      if (typeof easyMainSyncUrl !== 'function') return false;
      var url = easyMainSyncUrl();
      if (!url) return false;
      var old = sGet(null, 'sync');
      if (old && old !== url) sSet(null, 'sync_bak', old);
      sSet(null, 'sync', url);
      sRemove(null, 'noSync');
      if (typeof pulled !== 'undefined') pulled = false;
      return true;
    } catch (_) { return false; }
  }
  function loadGoogle() {
    return new Promise(function (resolve, reject) {
      if (root.google && root.google.accounts && root.google.accounts.oauth2) { resolve(); return; }
      var existing = document.querySelector('script[data-onboarding-google-199]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('google load')); });
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-onboarding-google-199', '1');
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('google load')); };
      document.head.appendChild(script);
    });
  }
  function friendlyGoogleError(error) {
    var t = text();
    var message = String(error && error.message || '');
    if (message.indexOf('حساب گوگل با مالک') >= 0) return message;
    if (/google|network|fetch|userinfo|load/i.test(message)) return t.googleNetworkError || t.googleError;
    return t.googleError;
  }
  function friendlyAutoError(error) {
    var t = text();
    var message = String(error && error.message || '');
    if (message.indexOf('Apps Script API') >= 0) return t.methodApiDisabled || t.methodAutoFailed;
    if (message.indexOf('حساب گوگل با مالک') >= 0) return message;
    if (/network|fetch|google|token|userinfo/i.test(message)) return t.methodNetworkError || t.methodAutoFailed;
    return t.methodAutoFailed;
  }
  function requestAutoToken() {
    return new Promise(function (resolve, reject) {
      try {
        var client = root.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_TEST_CLIENT,
          scope: EASY_SETUP_SCOPE,
          callback: function (response) {
            if (!response || response.error || !response.access_token) { reject(new Error('google token')); return; }
            resolve(response.access_token);
          },
          error_callback: function () { reject(new Error('google token')); }
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (error) { reject(error); }
    });
  }
  async function fetchUser(token) {
    var response = await accountOwnerFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
    if (!response.ok) throw new Error('userinfo');
    return response.json();
  }
  async function startGoogle() {
    var t = text();
    if (googleBusy) return;
    googleBusy = true;
    googleError = '';
    render();
    try {
      await loadGoogle();
      var client = root.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_TEST_CLIENT,
        scope: 'openid email',
        callback: async function (response) {
          try {
            if (!response || response.error || !response.access_token) throw new Error('login');
            var userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + response.access_token }, cache: 'no-store' });
            if (!userResponse.ok) throw new Error('userinfo');
            var user = await userResponse.json();
            if (!user || !user.email) throw new Error('email');
            if (typeof accountOwnerIdentify === 'function') accountOwnerIdentify(user.email);
            identityToken = response.access_token;
            identityEmail = user.email;
            saveGoogle(true);
            googleError = '';
          } catch (error) {
            identityToken = '';
            identityEmail = '';
            saveGoogle(false);
            googleError = friendlyGoogleError(error);
          } finally {
            googleBusy = false;
            render();
          }
        },
        error_callback: function () {
          googleBusy = false;
          identityToken = '';
          identityEmail = '';
          saveGoogle(false);
          googleError = t.googleError;
          render();
        }
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (error) {
      googleBusy = false;
      saveGoogle(false);
      googleError = friendlyGoogleError(error);
      render();
    }
  }
  async function runAuto() {
    var t = text();
    if (autoBusy) return;
    if (!readGoogle() || !identityEmail) {
      autoStatus = t.methodNeedGoogle;
      render();
      return;
    }
    if (hasConnection()) {
      saveMethod('auto');
      autoStatus = t.methodCurrent;
      goStep(3);
      return;
    }
    autoBusy = true;
    autoStatus = t.methodAutoRunning;
    render();
    try {
      await loadGoogle();
      var token = await requestAutoToken();
      var user = await fetchUser(token);
      if (!user || !user.email) throw new Error('email');
      if (String(user.email).toLowerCase() !== String(identityEmail).toLowerCase()) {
        autoStatus = t.methodAccountMismatch;
        return;
      }
      if (typeof accountOwnerIdentify === 'function') accountOwnerIdentify(user.email);
      if (typeof easyRun !== 'function') throw new Error('easy run');
      await easyRun(token, user.email);
      if (typeof easyWizardState === 'function' && easyWizardState().ready) {
        if (activateEasy()) {
          saveMethod('auto');
          autoStatus = t.methodAutoSuccess;
          goStep(3);
          return;
        }
      }
      if (typeof easyState === 'function' && easyState().mainUrl) autoStatus = t.methodAuthorizationPending;
      else autoStatus = t.methodAutoFailed;
    } catch (error) {
      autoStatus = friendlyAutoError(error);
    } finally {
      autoBusy = false;
      if (overlay) render();
    }
  }
  async function retryAuthorization() {
    if (autoBusy) return;
    var t = text();
    autoBusy = true;
    autoStatus = t.methodChecking;
    render();
    try {
      if (typeof easyCheckAuthorization === 'function') await easyCheckAuthorization();
      if (typeof easyWizardState === 'function' && easyWizardState().ready && activateEasy()) {
        saveMethod('auto');
        autoStatus = t.methodAutoSuccess;
        goStep(3);
        return;
      }
      autoStatus = t.methodAutoFailed;
    } catch (_) { autoStatus = t.methodAutoFailed; }
    finally { autoBusy = false; if (overlay) render(); }
  }
  function artSvg(kind, label) {
    var body = '';
    if (kind === 'ios1') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="10" rx="5" fill="#d1fae5"/><rect x="46" y="38" width="68" height="8" rx="4" fill="#e5e7eb"/><rect x="46" y="52" width="68" height="8" rx="4" fill="#e5e7eb"/><rect x="46" y="78" width="68" height="18" rx="9" fill="#0f766e"/><circle cx="80" cy="87" r="4" fill="#fff"/>';
    else if (kind === 'ios2') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><circle cx="80" cy="42" r="18" fill="#0f766e"/><path d="M80 31v22M69 42h22" stroke="#fff" stroke-width="4" stroke-linecap="round"/><rect x="46" y="72" width="68" height="12" rx="6" fill="#e5e7eb"/><path d="M52 78h16" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'ios3') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="12" rx="6" fill="#d1fae5"/><circle cx="56" cy="50" r="7" fill="#0f766e"/><rect x="68" y="44" width="44" height="8" rx="4" fill="#cbd5e1"/><rect x="46" y="68" width="68" height="16" rx="8" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/><path d="M58 76h44" stroke="#fdba74" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'ios4') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="14" rx="7" fill="#dcfce7"/><circle cx="56" cy="27" r="3" fill="#16a34a"/><rect x="46" y="44" width="68" height="10" rx="5" fill="#e5e7eb"/><rect x="46" y="60" width="68" height="10" rx="5" fill="#e5e7eb"/><rect x="46" y="78" width="68" height="18" rx="9" fill="#0f766e"/><path d="M58 87h44" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'android1') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="16" rx="8" fill="#d1fae5"/><path d="M56 28h48" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/><rect x="46" y="46" width="68" height="10" rx="5" fill="#e5e7eb"/><rect x="46" y="62" width="68" height="10" rx="5" fill="#e5e7eb"/><rect x="46" y="82" width="68" height="14" rx="7" fill="#0f766e"/>';
    else if (kind === 'android2') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="48" rx="8" fill="#f1f5f9"/><rect x="54" y="30" width="52" height="7" rx="3" fill="#94a3b8"/><rect x="54" y="44" width="44" height="7" rx="3" fill="#cbd5e1"/><rect x="54" y="76" width="52" height="16" rx="8" fill="#0f766e"/><path d="M66 84h28" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'android3') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="12" rx="6" fill="#d1fae5"/><rect x="46" y="42" width="68" height="18" rx="9" fill="#0f766e"/><path d="M58 51h44" stroke="#fff" stroke-width="3" stroke-linecap="round"/><rect x="46" y="70" width="68" height="18" rx="9" fill="#e5e7eb"/><path d="M58 79h44" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>';
    else if (kind === 'android4') body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/><rect x="46" y="20" width="68" height="46" rx="8" fill="#f1f5f9"/><rect x="54" y="30" width="52" height="7" rx="3" fill="#94a3b8"/><rect x="54" y="44" width="44" height="7" rx="3" fill="#cbd5e1"/><circle cx="80" cy="88" r="14" fill="#16a34a"/><path d="M74 88l5 5 9-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
    else body = '<rect x="36" y="8" width="88" height="104" rx="15" fill="#fff" stroke="#0f766e" stroke-width="3"/>';
    return '<svg class="onboarding-art-svg-199" viewBox="0 0 160 120" role="img" aria-label="' + esc(label) + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }
  function stepsList(items) {
    return items.map(function (item, index) {
      return '<div class="onboarding-step-199"><span class="onboarding-step-num-199">' + (index + 1) + '</span><div><strong>' + esc(item.title) + '</strong><p>' + esc(item.body) + '</p>' + artSvg(item.art, item.title) + '</div></div>';
    }).join('');
  }
  function googleStep() {
    var t = text();
    var connected = readGoogle();
    var skipped = sGet(null, GOOGLE_KEY) === '0';
    return '<div class="onboarding-hero-199" aria-hidden="true">&#128274;</div><h2 id="onboarding-title-199" tabindex="-1">' + esc(t.googleTitle) + '</h2><p>' + esc(t.googleBody) + '</p><div class="onboarding-status-199' + (connected ? ' ok' : '') + '" aria-live="polite">' + esc(connected ? t.googleLinked : skipped ? t.googleSkipped : googleError || t.googleStatusNotConnected) + '</div><button type="button" class="onboarding-primary-199" data-onboarding-google' + (connected || googleBusy ? ' disabled' : '') + '>' + esc(googleBusy ? t.googleLoading : connected ? t.googleLinked : t.googleLogin) + '</button>' + (!connected ? '<button type="button" class="onboarding-link-199" data-onboarding-google-skip>' + esc(t.googleSkip) + '</button>' : '') + '<div class="mut">' + esc(t.googlePrivacyNote) + '</div>';
  }
  function phoneStep() {
    var t = text();
    var phone = readPhone();
    return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.phoneTitle) + '</h2><p>' + esc(t.phoneBody) + '</p><div class="onboarding-choice-grid-199"><button type="button" class="onboarding-choice-199' + (phone === 'ios' ? ' selected' : '') + '" data-onboarding-phone="ios" aria-pressed="' + (phone === 'ios') + '"><span class="onboarding-choice-icon-199" aria-hidden="true">&#63743;</span><strong>' + esc(t.phoneIos) + '</strong><small>' + esc(t.phoneIosDesc) + '</small></button><button type="button" class="onboarding-choice-199' + (phone === 'android' ? ' selected' : '') + '" data-onboarding-phone="android" aria-pressed="' + (phone === 'android') + '"><span class="onboarding-choice-icon-199" aria-hidden="true">&#129302;</span><strong>' + esc(t.phoneAndroid) + '</strong><small>' + esc(t.phoneAndroidDesc) + '</small></button></div><div class="onboarding-note-199 ok">' + esc(t.phoneSaved) + '</div>';
  }
  function methodStep() {
    var t = text();
    var method = selectedMethod || readMethod();
    var connected = readGoogle();
    var current = hasConnection();
    var retry = typeof easyState === 'function' && easyState().mainUrl && !(typeof easyWizardState === 'function' && easyWizardState().ready);
    return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.methodTitle) + '</h2><p>' + esc(t.methodBody) + '</p><div class="onboarding-choice-grid-199"><button type="button" class="onboarding-choice-199' + (method === 'auto' ? ' selected' : '') + '" data-onboarding-method="auto" aria-pressed="' + (method === 'auto') + '"' + (!connected ? ' disabled' : '') + '><strong>' + esc(t.methodAuto) + '</strong><small>' + esc(t.methodAutoDesc) + '</small></button><button type="button" class="onboarding-choice-199' + (method === 'manual' ? ' selected' : '') + '" data-onboarding-method="manual" aria-pressed="' + (method === 'manual') + '"><strong>' + esc(t.methodManual) + '</strong><small>' + esc(t.methodManualDesc) + '</small></button></div>' + (!connected ? '<div class="onboarding-note-199">' + esc(t.methodNeedGoogle) + '</div>' : '') + (current ? '<div class="onboarding-note-199 ok">' + esc(t.methodCurrent) + '</div>' : '') + '<div id="easy-setup-status" class="onboarding-status-199" aria-live="polite">' + esc(autoStatus) + '</div>' + (retry ? '<button type="button" class="sec" data-onboarding-retry>' + esc(t.methodRetry) + '</button>' : '');
  }
  function summaryHtml() {
    var t = text();
    var state = summary();
    return '<div class="onboarding-summary-199"><div><span>' + esc(t.summaryGoogle) + '</span><b>' + esc(state.google) + '</b></div><div><span>' + esc(t.summaryPhone) + '</span><b>' + esc(state.phone) + '</b></div><div><span>' + esc(t.summaryConnection) + '</span><b>' + esc(state.connection) + '</b></div></div>';
  }
  function startStep() {
    var t = text();
    return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.startTitle) + '</h2><p>' + esc(t.startBody) + '</p>' + summaryHtml() + '<div class="onboarding-note-199">' + esc(t.startNote) + '</div>';
  }
  function platformStep() {
    var t = text();
    var phone = readPhone();
    if (phone === 'ios') {
      var url = shortcutUrl();
      var items = [
        { title: t.iosStep1Title, body: t.iosStep1, art: 'ios1' },
        { title: t.iosStep2Title, body: t.iosStep2, art: 'ios2' },
        { title: t.iosStep3Title, body: t.iosStep3, art: 'ios3' },
        { title: t.iosStep4Title, body: t.iosStep4, art: 'ios4' }
      ];
      return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.iosTitle) + '</h2><p>' + esc(t.iosBody) + '</p><div class="onboarding-warning-199">' + esc(t.iosAskOff) + '</div><button type="button" class="onboarding-primary-199" data-onboarding-shortcut' + (!url ? ' disabled' : '') + '>' + esc(url ? t.iosDownload : t.iosSoon) + '</button><div class="mut">' + esc(t.iosNoUrl) + '</div><div class="onboarding-steps-199">' + stepsList(items) + '</div>';
    }
    var androidItems = [
      { title: t.androidStep1Title, body: t.androidStep1, art: 'android1' },
      { title: t.androidStep2Title, body: t.androidStep2, art: 'android2' },
      { title: t.androidStep3Title, body: t.androidStep3, art: 'android3' },
      { title: t.androidStep4Title, body: t.androidStep4, art: 'android4' }
    ];
    return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.androidTitle) + '</h2><p>' + esc(t.androidBody) + '</p><div class="onboarding-note-199">' + esc(t.androidNoShortcut) + '</div><div class="onboarding-steps-199">' + stepsList(androidItems) + '</div><div class="onboarding-note-199">' + esc(t.androidFuture) + '</div>';
  }
  function finishStep() {
    var t = text();
    return '<h2 id="onboarding-title-199" tabindex="-1">' + esc(t.finishTitle) + '</h2><p>' + esc(t.finishBody) + '</p>' + summaryHtml() + '<div class="onboarding-note-199 ok">' + esc(t.finishDone) + '</div><div class="mut">' + esc(t.finishNote) + '</div>';
  }
  function content(step) {
    if (step === 'google') return googleStep();
    if (step === 'phone') return phoneStep();
    if (step === 'method') return methodStep();
    if (step === 'start') return startStep();
    if (step === 'platform') return platformStep();
    return finishStep();
  }
  function nextDisabled(step) {
    if (googleBusy || autoBusy) return true;
    if (step === 'google') return !readGoogle() && sGet(null, GOOGLE_KEY) !== '0';
    if (step === 'phone') return !readPhone();
    if (step === 'method') return !(selectedMethod || readMethod());
    return false;
  }
  function footer(step, index) {
    var t = text();
    var label = step === 'finish' ? t.goApp : step === 'start' ? t.startButton : t.next;
    return '<div class="onboarding-foot-199"><button type="button" class="sec" data-onboarding-prev' + (index === 0 || googleBusy || autoBusy ? ' disabled' : '') + '>' + esc(t.back) + '</button><button type="button" class="onboarding-primary-199" data-onboarding-next' + (nextDisabled(step) ? ' disabled' : '') + '>' + esc(label) + '</button></div>';
  }
  function ensureStyle() {
    if (document.getElementById('onboarding-style-199')) return;
    var style = document.createElement('style');
    style.id = 'onboarding-style-199';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function ensureOverlay() {
    ensureStyle();
    if (overlay && document.body.contains(overlay)) return overlay;
    overlay = document.createElement('section');
    overlay.id = 'onboarding-199';
    overlay.className = 'onboarding-199';
    overlay.setAttribute('dir', 'rtl');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);
    document.body.classList.add('onboarding-active-199');
    return overlay;
  }
  function hideOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    try { document.body.classList.remove('onboarding-active-199'); } catch (_) {}
  }
  function render() {
    if (typeof document === 'undefined' || !document.body) return;
    var node = ensureOverlay();
    var t = text();
    var index = currentIndex();
    var step = STEPS[index];
    var total = STEPS.length;
    var progress = Math.round(((index + 1) / total) * 100);
    node.innerHTML = '<div class="onboarding-shell-199"><div class="onboarding-head-199"><div><strong>' + esc(t.appTitle) + '</strong><div class="mut">' + fmt(t.stepOf, { n: index + 1, total: total }) + '</div></div><span class="onboarding-step-chip-199">' + esc(stepTitle(step)) + '</span></div><div class="onboarding-progress-199"><span style="width:' + progress + '%"></span></div><div class="onboarding-content-199" id="onboarding-content-199">' + content(step) + '</div>' + footer(step, index) + '</div>';
    var heading = node.querySelector('#onboarding-title-199');
    if (heading && heading.focus) { try { heading.focus({ preventScroll: true }); } catch (_) { heading.focus(); } }
  }
  function goStep(index) {
    var next = Math.max(0, Math.min(STEPS.length - 1, index));
    saveStep(STEPS[next]);
    render();
  }
  async function nextStep() {
    var index = currentIndex();
    var step = STEPS[index];
    var t = text();
    if (step === 'google') {
      if (!readGoogle() && sGet(null, GOOGLE_KEY) !== '0') { googleError = t.googleError; render(); return; }
      goStep(index + 1);
      return;
    }
    if (step === 'phone') {
      if (!readPhone()) { render(); return; }
      goStep(index + 1);
      return;
    }
    if (step === 'method') {
      var method = selectedMethod || readMethod();
      if (!method) { render(); return; }
      if (method === 'manual') {
        saveMethod('manual');
        if (!hasConnection()) sSet(null, 'noSync', '1');
        autoStatus = t.methodManualSaved;
        goStep(index + 1);
        return;
      }
      if (!readGoogle()) { googleError = t.methodNeedGoogle; goStep(0); return; }
      await runAuto();
      return;
    }
    if (step === 'start') { goStep(index + 1); return; }
    if (step === 'platform') { goStep(index + 1); return; }
    if (step === 'finish') { finish(); }
  }
  function prevStep() {
    if (googleBusy || autoBusy) return;
    var index = currentIndex();
    if (index > 0) goStep(index - 1);
  }
  function finish() {
    if (!readMethod()) saveMethod('manual');
    if (readMethod() === 'manual' && !hasConnection()) sSet(null, 'noSync', '1');
    markDone();
    hideOverlay();
    try { if (typeof root.render === 'function') root.render(); } catch (_) {}
  }
  function reset() {
    sRemove(null, DONE_KEY);
    saveStep('google');
    googleError = '';
    autoStatus = '';
    hideOverlay();
    render();
  }
  function maybeShow() {
    if (typeof document === 'undefined' || !document.body) return false;
    if (document.getElementById('onboarding-199')) return true;
    if (!shouldShow()) return false;
    render();
    return true;
  }
  function settingsHtml() {
    var t = text();
    var phone = readPhone();
    return '<div class="card" id="onboarding-settings-199"><b>' + esc(t.settingsTitle) + '</b><div class="mut">' + esc(t.settingsBody) + '</div><div class="onboarding-choice-grid-199"><button type="button" class="onboarding-choice-199' + (phone === 'ios' ? ' selected' : '') + '" data-onboarding-phone="ios" aria-pressed="' + (phone === 'ios') + '"><strong>' + esc(t.phoneIos) + '</strong></button><button type="button" class="onboarding-choice-199' + (phone === 'android' ? ' selected' : '') + '" data-onboarding-phone="android" aria-pressed="' + (phone === 'android') + '"><strong>' + esc(t.phoneAndroid) + '</strong></button></div><div class="mut">' + esc(t.settingsPhone) + ': ' + esc(phone === 'ios' ? t.phoneIos : phone === 'android' ? t.phoneAndroid : t.notSelected) + '</div><div class="mut">' + esc(t.settingsConnection) + ': ' + esc(connectionStatus()) + '</div><button type="button" class="sec" id="onboarding-replay-199">' + esc(t.settingsReplay) + '</button></div>';
  }
  function settingsMount(container) {
    if (typeof document === 'undefined' || !container) return;
    if (container.querySelector && container.querySelector('#onboarding-settings-199')) return;
    container.insertAdjacentHTML('beforeend', settingsHtml());
  }
  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-onboarding-next]')) { event.preventDefault(); if (!nextDisabled(STEPS[currentIndex()])) void nextStep(); return; }
    if (target.closest('[data-onboarding-prev]')) { event.preventDefault(); prevStep(); return; }
    var phoneButton = target.closest('[data-onboarding-phone]');
    if (phoneButton) {
      event.preventDefault();
      savePhone(phoneButton.getAttribute('data-onboarding-phone'));
      if (overlay) render();
      else { try { if (typeof root.render === 'function') root.render(); } catch (_) {} }
      return;
    }
    var methodButton = target.closest('[data-onboarding-method]');
    if (methodButton) {
      event.preventDefault();
      if (methodButton.disabled) return;
      selectedMethod = saveMethod(methodButton.getAttribute('data-onboarding-method'));
      render();
      return;
    }
    if (target.closest('[data-onboarding-google]')) { event.preventDefault(); if (!googleBusy) void startGoogle(); return; }
    if (target.closest('[data-onboarding-google-skip]')) {
      event.preventDefault();
      if (!root.confirm || root.confirm(text().googleSkipConfirm)) {
        saveGoogle(false);
        selectedMethod = saveMethod('manual');
        goStep(currentIndex() + 1);
      }
      return;
    }
    if (target.closest('[data-onboarding-shortcut]')) {
      event.preventDefault();
      var url = shortcutUrl();
      if (url) root.open(url, '_blank');
      return;
    }
    if (target.closest('[data-onboarding-retry]')) { event.preventDefault(); void retryAuthorization(); return; }
    if (target.closest('#onboarding-replay-199')) { event.preventDefault(); reset(); }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', onClick);
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { maybeShow(); }, 1600); });
  }
  root.Onboarding199 = {
    normalizePhone: normalizePhone,
    savePhone: savePhone,
    readPhone: readPhone,
    readMethod: readMethod,
    saveMethod: saveMethod,
    readStep: readStep,
    saveStep: saveStep,
    readState: readState,
    shouldShow: shouldShow,
    markDone: markDone,
    reset: reset,
    maybeShow: maybeShow
  };
  root.onboardingMaybeShow199 = maybeShow;
  root.onboardingSettingsMount199 = settingsMount;
  root.onboardingReset199 = reset;
})(typeof window !== 'undefined' ? window : globalThis);
