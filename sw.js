const CACHE_NAME = 'c37a-nk-v2';
const APP_SHELL_CACHE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './logo.svg'
];

const isCacheableStaticAsset = (request, url) => {
    if (request.method !== 'GET') {
        return false;
    }

    if (url.origin !== self.location.origin) {
        return false;
    }

    if (url.search) {
        return false;
    }

    if (
        url.pathname.startsWith('/src/') ||
        url.pathname.startsWith('/node_modules/') ||
        url.pathname.includes('/@vite/') ||
        url.pathname.includes('/__vite') ||
        url.pathname.endsWith('/sw.js')
    ) {
        return false;
    }

    return ['style', 'script', 'worker', 'font', 'image'].includes(request.destination);
};

const isNavigationRequest = (request) => request.mode === 'navigate';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    if (isNavigationRequest(event.request)) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    if (!isCacheableStaticAsset(event.request, requestUrl)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseClone = networkResponse.clone();
                void caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });

                return networkResponse;
            });
        })
    );
});
