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
import wellnessRouter from './wellness.js';
import pushRouter from './push.js';
import trainingLoadRouter from './trainingLoad.js';
import readinessRouter from './readiness.js';
import correlationsRouter from './correlations.js';

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
router.use('/wellness', wellnessRouter);
router.use('/push', pushRouter);
router.use('/training-load', trainingLoadRouter);
router.use('/readiness', readinessRouter);
router.use('/correlations', correlationsRouter);

export default router;
