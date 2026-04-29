import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import todayRouter from './today.js';
import weekRouter from './week.js';
import hydrationRouter from './hydration.js';
import mealsRouter from './meals.js';
import activitiesRouter from './activities.js';
import coachingRouter from './coaching.js';
import planContextRouter from './planContext.js';
import exerciseWeightsRouter from './exerciseWeights.js';
import progressRouter from './progress.js';
import bodyWeightRouter from './bodyWeight.js';
import pushRouter from './push.js';

const router = Router();

router.use(requireAuth);

router.use('/today', todayRouter);
router.use('/week', weekRouter);
router.use('/hydration', hydrationRouter);
router.use('/meals', mealsRouter);
router.use('/activities', activitiesRouter);
router.use('/coaching-note', coachingRouter);
router.use('/plan-context', planContextRouter);
router.use('/exercise-weights', exerciseWeightsRouter);
router.use('/progress', progressRouter);
router.use('/body-weight', bodyWeightRouter);
router.use('/push', pushRouter);

export default router;
