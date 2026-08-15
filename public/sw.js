const CACHE_NAME = 'rescuelink-pwa-v5'
const URLS_TO_CACHE = ['/', '/manifest.json', '/main_logo.jpg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(URLS_TO_CACHE.map((url) => cache.add(url)))
    })
  )
  self.skipWaiting()
})

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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((res) => res || caches.match('/'))
    })
  )
})

// 🚀 Web Push Protocol Listener — Wakes up Service Worker on Android/iOS/Desktop even when app is COMPLETELY CLOSED
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 EMERGENCY ALERT NEAR YOU',
    body: 'A new emergency incident has been reported in your sector. Tap to view hazard map.',
    url: '/happenings',
    tag: 'emergency-push-alert',
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [300, 100, 300, 100, 400],
      tag: data.tag || `incident-push-${Date.now()}`,
      renotify: true,
      data: { url: data.url || '/happenings' },
    })
  )
})

// Handle background notification click (opens app / widget window even if browser tab was closed)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/happenings'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/happenings') && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Listen for messages from main thread (e.g. background proximity incident trigger)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_PROXIMITY_ALERT') {
    const { title, body, incidentId, url } = event.data
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `incident-alert-${incidentId}`,
      renotify: true,
      vibrate: [300, 100, 300, 100, 400],
      data: { url: url || '/happenings' },
    })
  }
})
