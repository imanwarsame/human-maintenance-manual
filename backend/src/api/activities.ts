import { Router } from 'express';
import { z } from 'zod';
import { getActivities, getActivitiesForDateRange, logActivity, updateActivity } from '../db/queries/activities.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    if (from && to) {
      const activities = await getActivitiesForDateRange(from, to);
      res.json(activities);
      return;
    }
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

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight_kg: z.number().positive().optional(),
});

const PatchActivitySchema = z.object({
  exercises: z.array(ExerciseSchema).optional(),
  is_planned: z.literal(false).optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = PatchActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { exercises, is_planned } = parsed.data;
    const updates: Parameters<typeof updateActivity>[1] = {};
    if (exercises !== undefined) updates.raw_json = { exercises };
    if (is_planned === false) updates.is_planned = false;
    const activity = await updateActivity(id, updates);
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

export default router;
