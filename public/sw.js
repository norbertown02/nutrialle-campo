const CACHE = 'nutrialle-v10'
const STATIC = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/manifest.json'
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const resClone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, resClone))
        }
        return res
      }).catch(() => cached)
      return cached || network
    })
  )
})

self.addEventListener('sync', e => {
  if (e.tag === 'sync-offline-data') {
    e.waitUntil(self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_REQUESTED' }))
    ))
  }
})

self.addEventListener('periodicsync', e => {
  if (e.tag === 'update-cache') {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  }
})

self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  self.registration.showNotification(data.title || 'Nutrialle', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200]
  })
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
