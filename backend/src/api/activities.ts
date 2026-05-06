import { Router } from 'express';
import { z } from 'zod';
import { getActivities, getActivitiesForDateRange, deleteActivity, updateActivity } from '../db/queries/activities.js';
import { getValidStravaToken } from '../strava/oauth.js';

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

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight_kg: z.number().positive().optional(),
});

const PatchActivitySchema = z.object({
  exercises: z.array(ExerciseSchema).optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = PatchActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { exercises } = parsed.data;
    const updates: Parameters<typeof updateActivity>[1] = {};
    if (exercises !== undefined) updates.raw_json = { exercises };
    const activity = await updateActivity(id, updates);
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

router.get('/strava-raw/:externalId', async (req, res, next) => {
  try {
    const token = await getValidStravaToken();
    const resp = await fetch(`https://www.strava.com/api/v3/activities/${req.params.externalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      res.status(resp.status).json({ error: `Strava fetch failed: ${resp.statusText}` });
      return;
    }
    const data = await resp.json();
    console.log(`[strava] raw fetch for ${req.params.externalId}:`, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteActivity(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
