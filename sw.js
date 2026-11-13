const C = 'exp-v154', F = ['./', 'index.html', 'app.js?v=154', 'easy-google-setup.js?v=154', 'legacy-inbox.js?v=154', 'invoice.js?v=154', 'direct-sync-core.js?v=154', 'legacy-reference.js?v=154', 'direct-sync-ui.js?v=154', 'direct-sync-auto.js?v=154', 'direct-sync-receive.js?v=154', 'parser.js?v=154', 'xlsx.full.min.js', 'manifest.json', 'Code.gs', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => { if (new URL(e.request.url).origin !== location.origin) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true }))); });
