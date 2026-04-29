/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// eslint-disable-next-line no-restricted-globals
declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: unknown;
  actions?: Array<{ action: string; title: string }>;
}

self.addEventListener('push', (event) => {
  const pushEvent = event as PushEvent;
  if (!pushEvent.data) return;

  const data = pushEvent.data.json() as PushPayload;

  pushEvent.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icons/icon-192.png',
      badge: data.badge ?? '/icons/badge-96.png',
      tag: data.tag ?? 'water-reminder',
      data: data.data,
      // `actions` is part of the Notifications API for service workers but not in DOM lib types
      ...(data.actions ? { actions: data.actions } : {}),
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event) => {
  const clickEvent = event as NotificationEvent;
  clickEvent.notification.close();

  const action = (event as Event & { action?: string }).action ?? '';
  if (action === 'dismiss') return;

  const url = action === 'log-250ml' ? '/?log=250' : '/hydration';

  clickEvent.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          (client as WindowClient).focus();
          client.postMessage({ type: 'NAVIGATE', url });
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
