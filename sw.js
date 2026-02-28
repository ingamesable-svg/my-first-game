const CACHE_NAME = 'star-catcher-v1';
const urlsToCache = [
  '/my-first-game/',
  '/my-first-game/index.html',
  '/my-first-game/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        // If some URLs fail, that's okay - continue
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        // If offline and not in cache, return a fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/my-first-game/index.html');
        }
      });
    })
  );
});
