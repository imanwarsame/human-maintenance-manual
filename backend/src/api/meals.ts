import { Router } from 'express';
import { z } from 'zod';
import { markMealEaten, logMealDeviation } from '../db/queries/meals.js';

const router = Router();

router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const eaten_at = (req.body?.eaten_at as string | undefined) ?? new Date().toISOString();
    const completion = await markMealEaten(id, eaten_at);
    res.status(201).json(completion);
  } catch (err) {
    next(err);
  }
});

const DeviationSchema = z.object({
  description: z.string().min(1),
  kcal: z.number().int().positive().optional(),
  protein_g: z.number().positive().optional(),
  deviation_type: z.enum(['skipped', 'swapped', 'ate_out', 'extras']),
  date: z.string().optional(),
});

router.post('/:id/deviation', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = DeviationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
    const deviation = await logMealDeviation({
      meal_plan_id: id,
      date,
      description: parsed.data.description,
      kcal: parsed.data.kcal,
      protein_g: parsed.data.protein_g,
      deviation_type: parsed.data.deviation_type,
    });
    res.status(201).json(deviation);
  } catch (err) {
    next(err);
  }
});

export default router;
