const CACHE_NAME = 'mecanocheck-v1';
const OFFLINE_URL = '/';

// Fichiers à mettre en cache pour le mode hors ligne
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
];

// Installation — mise en cache des ressources essentielles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS.filter(url => !url.startsWith('http')));
    }).then(() => self.skipWaiting())
  );
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — stratégie : réseau d'abord, cache en fallback
self.addEventListener('fetch', event => {
  // On ignore les requêtes non-GET et les API externes
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('railway.app')) return;
  if (event.request.url.includes('overpass-api')) return;
  if (event.request.url.includes('nominatim')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la réponse est valide, on la met en cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Hors ligne : on retourne le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Pour les pages HTML, on retourne la home
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Notification push (préparé pour plus tard)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'MécanoCheck', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
