/* Pure conflict checks for the future direct Sheets connection. */
(function (root) {
  'use strict';
  const excluded = new Set(['sync', 'sync_bak', 'syncLock', 'sheetUrl', 'noSync', 'googleTestSheet', 'googleBackupCopy']);

  function canonicalData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid backup data');
    const result = {};
    for (const key of Object.keys(data).sort()) {
      if (excluded.has(key)) continue;
      if (typeof data[key] !== 'string') throw new Error('Invalid backup value');
      result[key] = data[key];
    }
    return JSON.stringify(result);
  }

  // Each immutable record points to its predecessor; concurrent saves create
  // multiple heads, which must never be silently merged or overwritten.
  function inspectHistory(records) {
    if (!Array.isArray(records)) throw new Error('Invalid history');
    if (!records.length) return { state: 'empty', heads: [] };
    const byId = new Map(), parents = new Set();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(record.id) ||
          typeof record.parent !== 'string' || (record.parent && !/^[A-Za-z0-9_-]{1,128}$/.test(record.parent)) ||
          byId.has(record.id)) throw new Error('Invalid history record');
      byId.set(record.id, record);
    }
    let roots = 0;
    for (const record of records) {
      if (!record.parent) roots++;
      else {
        if (!byId.has(record.parent)) throw new Error('Missing history record');
        parents.add(record.parent);
      }
    }
    if (roots !== 1) throw new Error('Invalid history roots');
    const heads = records.filter(record => !parents.has(record.id));
    if (!heads.length) throw new Error('Invalid history cycle');
    const reached = new Set();
    for (const head of heads) {
      const path = new Set();
      let record = head;
      while (record) {
        if (path.has(record.id)) throw new Error('Invalid history cycle');
        path.add(record.id); reached.add(record.id);
        record = record.parent ? byId.get(record.parent) : null;
      }
    }
    if (reached.size !== records.length) throw new Error('Disconnected history');
    return { state: heads.length === 1 ? 'linear' : 'conflict', heads: heads.map(record => record.id) };
  }

  function decide(base, local, remote) {
    if (base == null) return 'uninitialized';
    if (typeof base !== 'string' || typeof local !== 'string' || typeof remote !== 'string') throw new Error('Invalid comparison');
    if (local === remote) return 'unchanged';
    if (remote === base) return 'upload';
    if (local === base) return 'download';
    return 'conflict';
  }

  const api = Object.freeze({ canonicalData, inspectHistory, decide });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DirectSyncCore = api;
})(globalThis);
