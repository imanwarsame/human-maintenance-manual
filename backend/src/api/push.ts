import { Router } from 'express';
import { upsertSubscription, deleteSubscription } from '../db/queries/pushSubscriptions.js';

const router = Router();

router.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Missing endpoint or keys' });
      return;
    }
    const userAgent = req.headers['user-agent'];
    await upsertSubscription(endpoint, keys.p256dh, keys.auth, userAgent);
    res.status(201).end();
  } catch (err) {
    next(err);
  }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' });
      return;
    }
    await deleteSubscription(endpoint);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
