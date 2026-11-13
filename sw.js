const C = 'exp-v151', F = ['./', 'index.html', 'app.js?v=151', 'easy-google-setup.js?v=151', 'legacy-inbox.js?v=151', 'invoice.js?v=151', 'direct-sync-core.js?v=151', 'legacy-reference.js?v=151', 'direct-sync-ui.js?v=151', 'direct-sync-auto.js?v=151', 'direct-sync-receive.js?v=151', 'parser.js?v=151', 'xlsx.full.min.js', 'manifest.json', 'Code.gs', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => { if (new URL(e.request.url).origin !== location.origin) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
