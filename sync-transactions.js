(function (root) {
  'use strict';
  function version(row) { const n = Number(row && row.updatedAt); return Number.isFinite(n) && n > 0 ? n : 0; }
  function normalizeRaw(value) {
    return String(value || '').normalize('NFKC').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200e\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ').trim();
  }
  function sameSms(a, b) {
    const raw = normalizeRaw(a.raw), date = String(a.date || '');
    if (!raw || raw !== normalizeRaw(b.raw) || !/\d{1,2}:\d{2}/.test(date) || date !== String(b.date || '')) return false;
    if (a.ghost || b.ghost || a.type !== b.type || Number(a.amount) !== Number(b.amount)) return false;
    return !a.account || !b.account || String(a.account) === String(b.account);
  }
  function content(row) { const copy = { ...row }; delete copy.updatedAt; return JSON.stringify(copy); }
  function markUpdated(rows, previous, now) {
    const old = new Map(previous.map(row => [String(row.id), row]));
    for (const row of rows) {
      const before = old.get(String(row.id));
      if (!before || content(row) !== content(before)) row.updatedAt = Math.max(now, version(before) + 1, version(row));
    }
  }
  function merge(local, remote, deleted, dirty) {
    const gone = new Set(deleted.map(String)), result = new Map();
    const localIds = new Set(local.map(row => String(row.id))), remoteIds = new Set(remote.map(row => String(row.id)));
    for (const row of remote) if (!gone.has(String(row.id))) result.set(String(row.id), row);
    for (const row of local) {
      const id = String(row.id); if (gone.has(id)) continue;
      const other = result.get(id); if (!other) { result.set(id, row); continue; }
      const a = version(row), b = version(other);
      let selected = a > b ? row : b > a ? other : dirty ? row : other;
      if ((row.pending === false || other.pending === false) && selected.pending === true && !(selected === row && a > b)) selected = { ...selected, pending: false };
      result.set(id, selected);
    }
    const unique = [];
    for (const row of result.values()) {
      const candidates = unique.map((item, index) => ({ item, index })).filter(({ item }) => {
        const first = String(item.id), second = String(row.id);
        return ((remoteIds.has(first) && !localIds.has(first) && localIds.has(second) && !remoteIds.has(second)) || (localIds.has(first) && !remoteIds.has(first) && remoteIds.has(second) && !localIds.has(second))) && sameSms(item, row);
      });
      const duplicate = candidates.length === 1 ? candidates[0].index : -1;
      if (duplicate < 0) { unique.push(row); continue; }
      const previous = unique[duplicate];
      if (previous.parent || row.parent || previous.invoicePaymentId || row.invoicePaymentId || [...result.values()].some(item => String(item.parent || '') === String(previous.id) || String(item.parent || '') === String(row.id))) { unique.push(row); continue; }
      const chosen = version(row) > version(previous) ? row : previous;
      unique[duplicate] = (previous.pending === false || row.pending === false) && chosen.pending ? { ...chosen, pending: false } : chosen;
    }
    return unique;
  }
  root.SyncTransactions = Object.freeze({ markUpdated, merge, sameSms });
})(globalThis);
