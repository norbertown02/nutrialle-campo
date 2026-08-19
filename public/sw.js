const CACHE = 'nutrialle-v17'
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
  // Sem skipWaiting() aqui de propósito: se um vendedor está com o app
  // aberto em campo, trocar a versão sozinho no meio da sessão pode
  // deixar a tela pedindo por um chunk (JS de rota) que já não existe
  // mais no servidor depois do deploy novo. O app novo fica "esperando"
  // até o usuário confirmar (via mensagem SKIP_WAITING), o que só
  // acontece quando ele toca em "Atualizar" no aviso — ou na próxima
  // vez que abrir o app do zero.
})

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
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
    // Rede primeiro; se der certo, guarda a resposta no cache para poder
    // servir essa mesma consulta offline depois. Se a rede falhar, usa
    // o que tiver em cache (a fonte principal de dados offline é o
    // IndexedDB do app, isso aqui é só uma camada extra de segurança).
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const resClone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, resClone))
          }
          return res
        })
        .catch(() => caches.match(e.request))
    )
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
