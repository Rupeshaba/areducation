// AR Education — Push Notification Service Worker
// Yeh file browser/phone ke background me chalti hai, tab bhi jab app/tab
// band ho. Jab backend web-push bhejta hai, 'push' event fire hota hai aur
// hum OS ke notification tray me dikha dete hain (jaise WhatsApp/Instagram).

self.addEventListener('install', () => {
  // Naya SW turant active ho jaye, purane ka wait na kare
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = { title: 'AR Education', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'AR Education'
  const options = {
    body: payload.message || payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    image: payload.imageUrl || undefined,
    tag: payload.tag || 'ar-edu-notification',
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: payload.linkUrl || payload.url || '/notifications',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// User notification par tap kare to app ka relevant page khol/focus kare
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/notifications'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Agar app already ek tab me khula hai, usi ko focus + navigate kar do
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(targetUrl)
          return
        }
      }
      // Warna naya tab/window khol do
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
