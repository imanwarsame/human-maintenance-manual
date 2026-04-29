import { Router } from 'express';
import { z } from 'zod';
import { getBodyWeightLogs, upsertBodyWeight } from '../db/queries/bodyWeight.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const logs = await getBodyWeightLogs(from, to);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

const LogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().positive(),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = LogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const log = await upsertBodyWeight(parsed.data.date, parsed.data.weight_kg);
    res.json(log);
  } catch (err) {
    next(err);
  }
});

export default router;
