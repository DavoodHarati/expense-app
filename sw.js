const C = 'exp-v150', F = ['./', 'index.html', 'app.js?v=150', 'easy-google-setup.js?v=150', 'legacy-inbox.js?v=150', 'invoice.js?v=150', 'direct-sync-core.js?v=150', 'legacy-reference.js?v=150', 'direct-sync-ui.js?v=150', 'direct-sync-auto.js?v=150', 'direct-sync-receive.js?v=150', 'parser.js?v=150', 'xlsx.full.min.js', 'manifest.json', 'Code.gs', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => { if (new URL(e.request.url).origin !== location.origin) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
