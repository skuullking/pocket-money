// Ne met en cache que la coquille de l'app : les réponses de l'API, qui contiennent
// des données de mineurs, ne sont jamais stockées sur l'appareil.
const CACHE = 'pocketmoney-v1';
const SHELL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  // Les fichiers de /assets/ ont un hash dans leur nom : leur contenu ne change jamais.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(response => {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
