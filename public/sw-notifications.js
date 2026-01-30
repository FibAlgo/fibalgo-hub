// FibAlgo Push Notification Service Worker
// This file should be served from the root of the domain

const CACHE_NAME = 'fibalgo-notifications-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'FibAlgo',
    body: 'You have a new notification',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag: 'default',
    url: '/terminal'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo-icon.png',
    badge: data.badge || '/logo-icon.png',
    tag: data.tag || 'fibalgo-notification',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/terminal',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'View',
        icon: '/icons/check.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/x.png'
      }
    ],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const url = event.notification.data?.url || '/terminal';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes('/terminal') && 'focus' in client) {
            return client.focus().then(() => {
              client.navigate(url);
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync notification read status when back online
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingReads = await cache.match('pending-reads');
    
    if (pendingReads) {
      const ids = await pendingReads.json();
      
      await fetch('/api/user/notifications/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notification_ids: ids })
      });
      
      await cache.delete('pending-reads');
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}
