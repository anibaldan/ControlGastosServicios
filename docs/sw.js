const CACHE_NAME = 'control-gastos-v2';
const ASSETS = [
    '.',
    'index.html',
    'css/styles.css',
    'js/db.js',
    'js/services.js',
    'js/charts.js',
    'js/ui-core.js',
    'js/ui-payments.js',
    'js/ui-entities.js',
    'js/ui-data.js',
    'js/ui-charts.js',
    'js/app.js',
    'lib/chart.js',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            }).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('index.html');
                }
            });
        })
    );
});
