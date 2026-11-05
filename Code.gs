// Google Apps Script: این کد را در Extensions ← Apps Script همان Google Sheet بچسبانید.
// Deploy ← New deployment ← Web app ← Execute as: Me ← Who has access: Anyone
const TX_HEAD = ['id', 'date', 'account', 'type', 'amount', 'balance', 'cat', 'desc', 'pending', 'xfer', 'person', 'loan', 'raw', 'json'];
const LOG_HEAD = ['at', 'time', 'ok', 'msg', 'raw'];

function sh_(name, head) {
  const ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); s.setFrozenRows(1); }
  s.setRightToLeft(true);
  return s;
}
function rows_(s, n) {
  const last = s.getLastRow();
  return last < 2 ? [] : s.getRange(2, 1, last - 1, n).getValues();
}
function put_(s, head, data) {
  const last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, head.length).clearContent();
  if (!data.length) return;
  const r = s.getRange(2, 1, data.length, head.length);
  r.setNumberFormat('@');
  r.setValues(data);
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() {
  try {
  const tx = rows_(sh_('Transactions', TX_HEAD), TX_HEAD.length).map(r => { try { return JSON.parse(r[13]); } catch (e) { return null; } }).filter(Boolean);
  const accounts = {};
  rows_(sh_('Accounts', ['key', 'name']), 2).forEach(r => { if (r[0] !== '') accounts[String(r[0])] = String(r[1]); });
  const log = rows_(sh_('SMS', LOG_HEAD), LOG_HEAD.length).map(r => ({ at: Number(r[0]), ok: r[2] === 'true' || r[2] === true, msg: String(r[3]), raw: String(r[4]) }));
  const rem = rows_(sh_('Reminders', ['id', 'json']), 2).map(r => { try { return JSON.parse(r[1]); } catch (e) { return null; } }).filter(Boolean);
  const pr = {}; rows_(sh_('Profile', ['key', 'value']), 2).forEach(r => pr[String(r[0])] = String(r[1]));
  const inbox = rows_(sh_('Inbox', ['id', 'raw']), 2).map(r => ({ id: String(r[0]), raw: String(r[1]) }));
  return out_({ ok: true, inbox, rem, tx, accounts, log, profile: { job: pr.job || '', work: pr.work || '' }, sheetUrl: (SpreadsheetApp.getActive() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'))).getUrl() });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.inbox) { sh_('Inbox', ['id', 'raw']).appendRow([String(Date.now()) + Math.floor(Math.random() * 1000), String(d.inbox)]); return out_({ ok: true }); }
    if (d.ack) {
      const s = sh_('Inbox', ['id', 'raw']), keep = rows_(s, 2).filter(r => d.ack.indexOf(String(r[0])) < 0);
      put_(s, ['id', 'raw'], keep); return out_({ ok: true });
    }
    if (d.tx) put_(sh_('Transactions', TX_HEAD), TX_HEAD, d.tx.map(t => [String(t.id), t.date || '', t.account || '', t.type || '', String(t.amount), t.balance == null ? '' : String(t.balance), t.cat || '', t.desc || '', String(!!t.pending), String(!!t.xfer), t.person || '', t.loan || '', t.raw || '', JSON.stringify(t)]));
    if (d.profile) put_(sh_('Profile', ['key', 'value']), ['key', 'value'], [['job', d.profile.job || ''], ['work', d.profile.work || '']]);
    if (Array.isArray(d.rem)) put_(sh_('Reminders', ['id', 'json']), ['id', 'json'], d.rem.map(r => [String(r.id), JSON.stringify(r)]));
    if (d.accounts) put_(sh_('Accounts', ['key', 'name']), ['key', 'name'], Object.entries(d.accounts).map(([k, v]) => [k, v]));
    if (d.log) {
      const s = sh_('SMS', LOG_HEAD);
      const old = {}; rows_(s, LOG_HEAD.length).forEach(r => old[String(r[0])] = r);
      d.log.forEach(l => { old[String(l.at)] = [String(l.at), new Date(l.at).toLocaleString('fa-IR'), String(!!l.ok), l.msg || '', l.raw || '']; });
      put_(s, LOG_HEAD, Object.values(old).sort((a, b) => Number(b[0]) - Number(a[0])));
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}
