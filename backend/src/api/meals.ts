import { Router } from 'express';
import { markMealEaten, getMealPlansForDate, getMealPlansForDateRange, deleteMealPlan, writeMealPlan } from '../db/queries/meals.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { date, meal_type, meal_name, description, kcal, protein_g, carbs_g, fat_g, prep_notes } = req.body as {
      date: string;
      meal_type: string;
      meal_name: string;
      description?: string;
      kcal?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      prep_notes?: string;
    };
    if (!date || !meal_type || !meal_name) {
      res.status(400).json({ error: 'date, meal_type, and meal_name are required' });
      return;
    }
    const [meal] = await writeMealPlan([{ date, meal_type: meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack', meal_name, description, kcal, protein_g, carbs_g, fat_g, prep_notes, created_by: 'manual' }]);
    res.status(201).json(meal);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { date, from, to } = req.query as Record<string, string | undefined>;
    if (from && to) {
      const meals = await getMealPlansForDateRange(from, to);
      res.json(meals);
      return;
    }
    const d = date ?? new Date().toISOString().slice(0, 10);
    const meals = await getMealPlansForDate(d);
    res.json(meals);
  } catch (err) {
    next(err);
  }
});

// Marks a meal eaten, or edits the logged time if it's already been marked eaten
// (upserts on meal_plan_id, so calling this again just updates eaten_at).
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

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteMealPlan(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    next(err);
  }
});

export default router;
