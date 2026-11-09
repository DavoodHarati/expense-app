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

  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }

  function previewMerge(base, local, remote) {
    for (const value of [base, local, remote]) if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup data');
    const entities = new Set(['tx', 'rem', 'ppl', 'invoices']);
    const missing = Symbol('missing');
    const equal = (first, second) => first === missing || second === missing ? first === second : stable(first) === stable(second);
    const result = {}, conflicts = [];
    const resolve = (key, id, before, left, right) => {
      if (equal(left, right)) return left;
      if (equal(before, left)) return right;
      if (equal(before, right)) return left;
      conflicts.push({ key, id }); return missing;
    };
    const parse = value => { if (value === missing) return missing; if (typeof value !== 'string') throw new Error('Invalid backup value'); try { return JSON.parse(value); } catch (_) { return value; } };
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      if (excluded.has(key)) continue;
      const before = Object.prototype.hasOwnProperty.call(base, key) ? base[key] : missing;
      const left = Object.prototype.hasOwnProperty.call(local, key) ? local[key] : missing;
      const right = Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : missing;
      const arrays = [before, left, right].map(parse);
      if (entities.has(key) && arrays.every(value => value === missing || Array.isArray(value))) {
        const maps = arrays.map(value => {
          const map = new Map();
          for (const item of value === missing ? [] : value) {
            if (!item || (typeof item.id !== 'string' && typeof item.id !== 'number') || !String(item.id) || map.has(String(item.id))) throw new Error('Invalid or duplicate record ID in ' + key);
            map.set(String(item.id), item);
          }
          return map;
        });
        const merged = [];
        for (const id of new Set(maps.flatMap(map => [...map.keys()]))) {
          const values = maps.map(map => map.has(id) ? map.get(id) : missing);
          const item = resolve(key, id, ...values); if (item !== missing) merged.push(item);
        }
        if (arrays.some(value => value !== missing)) result[key] = JSON.stringify(merged);
      } else {
        const value = resolve(key, '', before, left, right);
        if (value !== missing) result[key] = value;
      }
    }
    return { data: result, conflicts };
  }

  function mergeAddedReminders(base, local, remote) {
    const value = (data, key) => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    const keys = new Set([...Object.keys(base), ...Object.keys(remote)]);
    for (const key of keys) if (!excluded.has(key) && key !== 'rem' && value(base, key) !== value(remote, key)) return null;
    if (value(base, 'rem') !== value(local, 'rem')) return null;
    let before, after;
    try { before = JSON.parse(value(base, 'rem') || '[]'); after = JSON.parse(value(remote, 'rem') || '[]'); } catch (_) { return null; }
    if (!Array.isArray(before) || !Array.isArray(after) || after.length <= before.length) return null;
    const ids = new Set();
    for (const item of after) {
      if (!item || (typeof item.id !== 'string' && typeof item.id !== 'number') || !String(item.id) || ids.has(String(item.id))) return null;
      ids.add(String(item.id));
    }
    for (let index = 0; index < before.length; index++) if (stable(before[index]) !== stable(after[index])) return null;
    return { ...local, rem: remote.rem };
  }

  const api = Object.freeze({ canonicalData, inspectHistory, decide, previewMerge, mergeAddedReminders });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DirectSyncCore = api;
})(globalThis);
