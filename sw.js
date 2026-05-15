const CACHE = 'decided-now-v19';
const SHELL = ['/', '/index.html'];

// Install â€” cache app shell
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Activate — delete old caches then reload all open tabs
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});

// Fetch â€” cache-first for app shell, network-first for external resources
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always fetch from network: posters, JustWatch API, streaming platforms
  if (
    url.includes('justwatch.com') ||
    url.includes('tmdb.org') ||
    url.includes('images.justwatch.com') ||
    url.includes('image.tmdb.org') ||
    !url.startsWith(self.location.origin)
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      });
    })
  );
});

