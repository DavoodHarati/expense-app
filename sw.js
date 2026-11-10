const C = 'exp-v134', F = ['./', 'index.html', 'app.js?v=134', 'invoice.js?v=118', 'direct-sync-core.js?v=120', 'legacy-reference.js?v=122', 'direct-sync-ui.js?v=134', 'direct-sync-auto.js?v=134', 'direct-sync-receive.js?v=129', 'parser.js?v=36', 'xlsx.full.min.js', 'manifest.json', 'Code.gs', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => { if (new URL(e.request.url).origin !== location.origin) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
