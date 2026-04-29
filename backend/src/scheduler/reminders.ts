import cron from 'node-cron';
import webpush from 'web-push';
import { getAllSubscriptions, deleteSubscription } from '../db/queries/pushSubscriptions.js';
import { getPlanContext } from '../db/queries/planContext.js';

const REMINDER_HOUR_START = 8;
const REMINDER_HOUR_END = 22;

const PUSH_PAYLOAD = JSON.stringify({
  title: 'Time to hydrate!',
  body: 'Tap to log a glass of water.',
  icon: '/icons/icon-192.png',
  badge: '/icons/badge-96.png',
  tag: 'water-reminder',
  data: { action: 'open-hydration' },
  actions: [
    { action: 'log-250ml', title: 'Log 250 ml' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
});

export function startReminderScheduler(): void {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — reminder scheduler disabled');
    return;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  // Run every 30 minutes; check interval preference inside the handler
  cron.schedule('0,30 * * * *', async () => {
    try {
      const enabled = await getPlanContext('reminders_enabled');
      if (!enabled) return;

      const intervalHours = Number((await getPlanContext('reminder_interval_hours')) ?? 1);
      const intervalMins = Math.max(30, Math.round(intervalHours * 60));

      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      if (hour < REMINDER_HOUR_START || hour >= REMINDER_HOUR_END) return;

      // Only fire when the current 30-min slot aligns with the chosen interval
      const minuteOfDay = hour * 60 + minute;
      const slot = Math.round(minuteOfDay / 30) * 30;
      if (slot % intervalMins !== 0) return;

      const subscriptions = await getAllSubscriptions();
      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              PUSH_PAYLOAD,
            );
          } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await deleteSubscription(sub.endpoint);
            } else {
              console.error('Push send error for endpoint', sub.endpoint, err);
            }
          }
        }),
      );
    } catch (err) {
      console.error('Reminder scheduler error:', err);
    }
  });

  console.log('Water reminder scheduler started');
}
