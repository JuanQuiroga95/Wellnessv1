// ─── W&P Service Worker ──────────────────────────────────────────────────────
// Handles push notifications and basic offline caching for PWA installability.

// Install: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate: Claim clients immediately
self.addEventListener('activate', (event) => {
  self.clients.claim()
})

// Fetch: Chrome requires a fetch handler for PWA installability
self.addEventListener('fetch', (event) => {
  // Simply pass-through the request (network only)
  // This satisfies the PWA requirement without complex caching that breaks on redirects
  return
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
