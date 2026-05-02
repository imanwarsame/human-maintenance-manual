import { api } from '../api/client.ts';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) buffer[i] = rawData.charCodeAt(i);
  return buffer;
}

export type PushSubscriptionStatus = 'subscribed' | 'denied' | 'default' | 'unsupported';

export async function getPushSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub ? 'subscribed' : 'default';
}

export async function registerSubscriptionWithBackend(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return false;
    const json = sub.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: json.endpoint,
      keys: json.keys,
    });
    return true;
  } catch (err) {
    console.error('Failed to register push subscription with backend:', err);
    return false;
  }
}

// Throws with a descriptive message on any failure so callers can surface the error.
export async function subscribeToPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.');
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
  if (!publicKey) {
    throw new Error('Push notification setup is incomplete — contact support.');
  }

  const registration = await navigator.serviceWorker.ready;

  // Unsubscribe any stale subscription first — a VAPID key mismatch will
  // cause subscribe() to throw a DOMException on some browsers.
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  await api.post('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: json.keys,
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await api.post('/api/push/unsubscribe', { endpoint });
}
