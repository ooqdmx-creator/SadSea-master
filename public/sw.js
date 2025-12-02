// Service Worker for logo caching and faster loading
const CACHE_NAME = 'logo-cache-v1';
const LOGO_CACHE_NAME = 'wallet-logos-v1';

// Assets to cache
const LOGOS_TO_CACHE = [
  '/logo.png',
  '/phantom-logo.png',
  '/solflare-logo.png',
  '/backpack-logo.png',
  '/glow-logo.png',
  '/trust-logo.png',
  '/exodus-logo.png',
  '/favicon1.ico',
  '/manifest.json'
];

// Install event - cache logos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(LOGO_CACHE_NAME).then(cache => {
      console.log('[SW] Caching logos...');
      return cache.addAll(LOGOS_TO_CACHE);
    })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  // Only handle logo requests
  if (event.request.url.includes('.png') || event.request.url.includes('.ico') || event.request.url.includes('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Fetch from network and cache for next time
        return fetch(event.request).then(networkResponse => {
          // Clone the response before caching
          const responseToCache = networkResponse.clone();
          
          caches.open(LOGO_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        });
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== LOGO_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

