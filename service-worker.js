const STATIC_CACHE = 'virginia-static-v1'
const RUNTIME_CACHE = 'virginia-runtime-v1'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/favicon.svg',
  '/site-config.js'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  const isStaticAsset =
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.json')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const cloned = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, cloned))
          return response
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, cloned))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  )
})
