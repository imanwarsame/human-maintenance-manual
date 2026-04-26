import { Router } from 'express';
import { z } from 'zod';
import { logWater, getHydrationForDate, getHydrationForDateRange } from '../db/queries/hydration.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { date, from, to } = req.query as Record<string, string | undefined>;
    if (from && to) {
      const logs = await getHydrationForDateRange(from, to);
      res.json(logs);
      return;
    }
    const d = date ?? new Date().toISOString().slice(0, 10);
    const summary = await getHydrationForDate(d);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

const LogWaterSchema = z.object({
  amount_ml: z.number().int().positive(),
  date: z.string().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = LogWaterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    const log = await logWater(date, parsed.data.amount_ml);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

export default router;
