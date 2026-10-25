// Service Worker for Three Men's Morris 3D (iPhone iOS PWA & GitHub Pages)
const CACHE_NAME = 'three-mens-morris-3d-v1.3';

const CORE_ASSETS = [
  './',
  './index.html',
  './three_mens_morris_3d.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './favicon.png',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of CORE_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          // Ignore individual asset failure during install so offline SW still activates
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Don't intercept PeerJS WebRTC signaling API calls
  if (req.url.includes('peerjs.com') || req.url.includes('/peerjs/')) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResp) => {
      if (cachedResp) {
        // Revalidate in background
        fetch(req).then((netResp) => {
          if (netResp && netResp.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, netResp));
          }
        }).catch(() => {});
        return cachedResp;
      }
      return fetch(req).then((netResp) => {
        if (netResp && (netResp.status === 200 || netResp.type === 'opaque')) {
          const copy = netResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return netResp;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
