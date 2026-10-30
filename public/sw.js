const CACHE = 'nutrialle-v20'
const APP_SHELL = '/index.html'
const STATIC = [
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(STATIC)

    // Mantém um shell para funcionamento offline, mas sempre obtém
    // a cópia de instalação diretamente da rede.
    try {
      const shell = await fetch(APP_SHELL, { cache: 'no-store' })
      if (shell.ok) await cache.put(APP_SHELL, shell.clone())
    } catch (_) {
      // A instalação ainda pode concluir; o shell será preenchido online.
    }

    // Migração v18 -> v19: assume imediatamente para retirar dos aparelhos
    // a estratégia antiga cache-first que podia prender o app por semanas.
    await self.skipWaiting()
  })())
})

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

async function networkFirst(request, fallbackRequest = request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request, { cache: 'no-store' })
    if (response.ok) await cache.put(fallbackRequest, response.clone())
    return response
  } catch (_) {
    return (await cache.match(fallbackRequest)) || (await cache.match(request))
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // APIs: rede primeiro para não congelar dados antigos; cache só como fallback.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.origin !== self.location.origin) return

  // CRÍTICO PARA ATUALIZAÇÕES:
  // toda navegação busca o HTML novo na rede. O cache serve somente offline.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith((async () => {
      const response = url.pathname.startsWith('/planos')
        ? await networkFirst(request)
        : await networkFirst(request, APP_SHELL)
      return response || new Response('Offline', { status: 503, statusText: 'Offline' })
    })())
    return
  }

  // Manifest deve ser revalidado para refletir alterações de PWA/TWA.
  if (url.pathname === '/manifest.json') {
    event.respondWith(networkFirst(request))
    return
  }

  // Assets gerados pelo Vite possuem hash no nome; podem usar cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Demais arquivos estáticos: rede primeiro, cache como fallback offline.
  event.respondWith(networkFirst(request))
})

self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(self.clients.matchAll().then(clients =>
      clients.forEach(client => client.postMessage({ type: 'SYNC_REQUESTED' }))
    ))
  }
})

self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(STATIC)
      try {
        const shell = await fetch(APP_SHELL, { cache: 'no-store' })
        if (shell.ok) await cache.put(APP_SHELL, shell.clone())
      } catch (_) {}
    })())
  }
})

self.addEventListener('push', event => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { body: event.data.text() } }
  const pathname = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url : '/agenda'
  event.waitUntil(self.registration.showNotification(data.title || 'Nutrialle Campo', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: pathname },
    vibrate: [160, 80, 160]
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/agenda', self.location.origin)
  if (url.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const current = list.find(client => new URL(client.url).origin === self.location.origin)
    if (current) {
      await current.navigate(url.href)
      return current.focus()
    }
    return self.clients.openWindow(url.href)
  })())
})
