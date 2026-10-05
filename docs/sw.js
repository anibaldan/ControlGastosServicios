const CACHE_NAME = 'control-gastos-v3';
const ASSETS = [
    '.',
    'index.html',
    'css/styles.css',
    'js/firebase-config.js',
    'js/db.js',
    'js/db-firestore.js',
    'js/auth.js',
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
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;
    if (url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com') ||
        url.hostname.includes('www.googleapis.com')) {
        return;
    }

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
