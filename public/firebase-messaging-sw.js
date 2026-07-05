// Firebase Cloud Messaging Service Worker
// Handles background push notifications when the app is minimised or closed.
//
// NOTE: The Firebase config keys here are PUBLIC (client-side identifiers, not secrets).
// They are safe to commit and are visible to anyone who visits your site.
// Real security is enforced by Firebase Security Rules, not by hiding these values.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase config ──────────────────────────────────────────────────────────
// These mirror your VITE_FIREBASE_* env vars.
// Update them after running `npm run build` or set via your CI/CD pipeline.
firebase.initializeApp({
  apiKey:            'REPLACE_WITH_YOUR_FIREBASE_API_KEY',
  authDomain:        'REPLACE_WITH_YOUR_AUTH_DOMAIN',
  projectId:         'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket:     'REPLACE_WITH_YOUR_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_YOUR_MESSAGING_SENDER_ID',
  appId:             'REPLACE_WITH_YOUR_APP_ID',
});

const messaging = firebase.messaging();

// ── Background message handler ───────────────────────────────────────────────
// Fires when a push arrives and the app tab is NOT in the foreground.
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const title   = payload.notification?.title || 'Finio Finance';
  const body    = payload.notification?.body  || '';

  self.registration.showNotification(title, {
    body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag:   payload.data?.tag || 'finio-push',
    data:  payload.data || {},
  });
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      }),
  );
});
