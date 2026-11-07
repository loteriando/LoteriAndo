/* LoteriAndo PWA — versão 13.14.0
   Rede primeiro para que a versão publicada seja verificada ao abrir o app.
   O cache é usado como alternativa quando o aparelho estiver offline.
*/
const CACHE_NAME = 'loteriando-v13.14.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './loteriando-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(APP_SHELL.map(async file => {
        try {
          const response = await fetch(file, { cache: 'reload' });
          if (response && response.ok) await cache.put(file, response);
        } catch (_) {
          // Um arquivo opcional ausente não deve impedir a instalação do SW.
        }
      }))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key.startsWith('loteriando-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Não interceptar chamadas ao Supabase.
  if (url.hostname === 'supabase.co' || url.hostname.endsWith('.supabase.co')) return;

  // Tratar somente recursos do próprio aplicativo.
  if (url.origin !== self.location.origin) return;

  // HTML sempre pela rede primeiro; cache apenas se estiver offline.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
        }
        return response;
      }).catch(() =>
        caches.match(request).then(cached => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // Recursos estáticos: rede primeiro, com fallback offline.
  event.respondWith(
    fetch(request).then(response => {
      if (response && response.ok) {
        const copia = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
