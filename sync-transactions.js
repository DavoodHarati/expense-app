(function (root) {
  'use strict';
  function version(row) { const n = Number(row && row.updatedAt); return Number.isFinite(n) && n > 0 ? n : 0; }
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
    for (const row of remote) if (!gone.has(String(row.id))) result.set(String(row.id), row);
    for (const row of local) {
      const id = String(row.id); if (gone.has(id)) continue;
      const other = result.get(id); if (!other) { result.set(id, row); continue; }
      const a = version(row), b = version(other);
      let selected = a > b ? row : b > a ? other : dirty ? row : other;
      if ((row.pending === false || other.pending === false) && selected.pending === true) selected = { ...selected, pending: false };
      result.set(id, selected);
    }
    return [...result.values()];
  }
  root.SyncTransactions = Object.freeze({ markUpdated, merge });
})(globalThis);
