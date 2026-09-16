// Only immutable, hashed build assets are cache-first. HTML stays fresh.
const CACHE = 'trainer-v4'
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icon-192.png']
self.addEventListener('push', event => {
  let message = {}
  try { message = event.data?.json() ?? {} } catch { /* Use safe defaults. */ }
  event.waitUntil(self.registration.showNotification(message.title || 'Время короткого занятия', {
    body: message.body || 'Повторим сотрудников из вашей библиотеки?',
    icon: '/icon-192.png', badge: '/icon-192.png', tag: message.tag === 'learning-test' ? 'learning-test' : 'learning-daily-' + new Date().toISOString().slice(0, 10),
    data: { url: '/today' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) { await existing.navigate('/today'); await existing.focus() }
    else await self.clients.openWindow('/today')
  })())
})
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('trainer-') && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' })
        if (response.ok && !url.search && !url.hash) {
          const cache = await caches.open(CACHE)
          await cache.put('/', response.clone())
        }
        return response
      } catch {
        const cache = await caches.open(CACHE)
        return await cache.match('/') || await cache.match('/offline.html') || new Response('Нет сети', { status: 503 })
      }
    })())
    return
  }
  if (/^\/assets\/.+-[\w-]+\.(js|css|wasm)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    })())
  }
})
