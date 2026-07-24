// ─── W&P Service Worker v2 ─────────────────────────────────────────────────
// Handles push notifications and provides offline fallback for PWA installability.

const CACHE_NAME = 'wp-cache-v2'
const OFFLINE_URL = '/login'

// Install: Cache the offline page and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache critical assets for offline support
      return cache.addAll([
        OFFLINE_URL,
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ])
    })
  )
  self.skipWaiting()
})

// Activate: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch: Network-first with offline fallback
// This is REQUIRED for Chrome PWA installability — must call event.respondWith()
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL)
      })
    )
    return
  }

  // For non-navigation requests (API, images, etc.) — network only, no caching
  // Don't interfere with API calls or auth requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        // If not in cache, return a generic 503 response so it doesn't crash the promise
        return new Response('{"error": "Offline and not cached"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    )
  }
})

// ─── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'W&P', body: 'Tenés una notificación', icon: '/icons/icon-192x192.png', url: '/login' }
  
  try {
    if (event.data) {
      const payload = event.data.json()
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        url: payload.url || data.url,
        badge: '/icons/icon-192x192.png',
        tag: payload.tag || 'wp-notification',
        ...payload,
      }
    }
  } catch (e) {
    // If payload is plain text
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'wp-notification',
    data: { url: data.url || '/login' },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Click on notification → open the app at the specified URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/login'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url)
    })
  )
})
