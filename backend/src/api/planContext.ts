import { Router } from 'express';
import { z } from 'zod';
import { getPlanContext, upsertPlanContext } from '../db/queries/planContext.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const key = req.query.key as string | undefined;
    if (!key) {
      res.status(400).json({ error: 'key query param required' });
      return;
    }
    const value = await getPlanContext(key);
    res.json({ key, value });
  } catch (err) {
    next(err);
  }
});

const UpdateSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

router.put('/', async (req, res, next) => {
  try {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const entry = await upsertPlanContext(parsed.data.key, parsed.data.value);
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

export default router;
