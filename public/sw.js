// Путь: public/sw.js
// Service worker: кэширует файлы приложения, чтобы оно открывалось мгновенно
// и не падало без интернета.
//
// ВАЖНО: после любого изменения этого файла увеличивайте номер версии кэша
// (trainer-v1 -> trainer-v2). Иначе браузер будет держать старую копию.

const CACHE = 'trainer-v1'

// Минимум, который сохраняем сразу при установке
const PRECACHE = ['/', '/offline.html', '/manifest.webmanifest', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())        // новая версия вступает в силу сразу
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  // Кэшируем только обычное чтение
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // КРИТИЧНО: запросы к Supabase не трогаем вообще.
  // Данные всегда должны быть свежими, кэшировать их нельзя.
  if (url.origin !== self.location.origin) return

  // Переход по адресу (открытие приложения): сначала сеть, потом кэш.
  // Так вы всегда получаете свежую версию, если интернет есть.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put('/', response.clone())
        return response
      } catch {
        const cached = await caches.match('/')
        return cached || caches.match('/offline.html')
      }
    })())
    return
  }

  // Остальное (скрипты, стили, иконки): сначала кэш, потом сеть.
  // Эти файлы при сборке получают уникальные имена, поэтому кэш не устаревает.
  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE)
        cache.put(request, response.clone())
      }
      return response
    } catch {
      return new Response('', { status: 504, statusText: 'Нет сети' })
    }
  })())
})