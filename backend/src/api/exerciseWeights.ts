import { Router } from 'express';
import { z } from 'zod';
import { getExerciseWeights, upsertExerciseWeights } from '../db/queries/exerciseWeights.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const weights = await getExerciseWeights();
    res.json(weights);
  } catch (err) {
    next(err);
  }
});

const UpsertSchema = z.object({
  weights: z.array(
    z.object({
      exercise_name: z.string().min(1),
      weight_kg: z.number().positive(),
    })
  ).min(1),
});

router.patch('/', async (req, res, next) => {
  try {
    const parsed = UpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    await upsertExerciseWeights(parsed.data.weights);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
