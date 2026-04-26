import { Router } from 'express';
import { z } from 'zod';
import { getActivities, logActivity } from '../db/queries/activities.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const activities = await getActivities(limit);
    res.json(activities);
  } catch (err) {
    next(err);
  }
});

const CreateActivitySchema = z.object({
  date: z.string(),
  type: z.string().min(1),
  duration_mins: z.number().int().positive().optional(),
  distance_km: z.number().positive().optional(),
  avg_hr: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const activity = await logActivity({ ...parsed.data, source: 'manual' });
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
});

export default router;
