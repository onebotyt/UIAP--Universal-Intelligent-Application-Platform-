/* global self, caches, fetch, URL */
/**
 * UIAP Edge — Basic Service Worker
 *
 * Provides a minimal offline fallback mechanism and caching
 * for the platform shell assets.
 */

const CACHE_NAME = 'uiap-edge-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not cache API requests or dynamic module UIs.
  // We want these to always be fresh, or fail if offline.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for later
        if (response.ok) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request);
      })
  );
});
