const CACHE_NAME = 'loteriando-static-v13.13.4';

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
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {

  const request = event.request;
  const url = new URL(request.url);

  /*
   * =========================================================
   * SUPABASE
   * =========================================================
   *
   * NÃO INTERCEPTAR requisições para o Supabase.
   *
   * Isso é importante para que:
   *
   * fetch(...)
   *
   * seja executado diretamente pelo navegador.
   */
  if (
    url.hostname === 'supabase.co' ||
    url.hostname.endsWith('.supabase.co')
  ) {
    return;
  }

  /*
   * Somente requisições GET serão tratadas pelo cache.
   */
  if (request.method !== 'GET') {
    return;
  }

  /*
   * =========================================================
   * ARQUIVOS DO PRÓPRIO LOTERIANDO
   * =========================================================
   *
   * Tenta primeiro pela rede.
   * Se estiver offline, utiliza o cache.
   */
  if (url.origin === self.location.origin) {

    event.respondWith(

      fetch(request)

        .then(response => {

          if (response && response.ok) {

            const copia = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copia);
            });

          }

          return response;
        })

        .catch(() => {

          return caches.match(request).then(cached => {

            if (cached) {
              return cached;
            }

            return caches.match('./index.html');

          });

        })

    );
  }

});