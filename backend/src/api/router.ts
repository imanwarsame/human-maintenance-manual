import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import todayRouter from './today.js';
import weekRouter from './week.js';
import hydrationRouter from './hydration.js';
import mealsRouter from './meals.js';
import activitiesRouter from './activities.js';
import coachingRouter from './coaching.js';

const router = Router();

router.use(requireAuth);

router.use('/today', todayRouter);
router.use('/week', weekRouter);
router.use('/hydration', hydrationRouter);
router.use('/meals', mealsRouter);
router.use('/activities', activitiesRouter);
router.use('/coaching-note', coachingRouter);

export default router;
