import { Router } from 'express';
import { getWeeklyVolumeByMuscleGroup, getExerciseHistory, getRunTimes } from '../db/queries/progress.js';
import { getBodyWeightLogs } from '../db/queries/bodyWeight.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Current week Mon–Sun
    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().slice(0, 10);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

    const [weeklyVolume, exerciseHistory, runTimes, bodyWeight] = await Promise.all([
      getWeeklyVolumeByMuscleGroup(weekStartStr, today),
      getExerciseHistory(ninetyDaysAgoStr, today),
      getRunTimes(sixMonthsAgoStr, today),
      getBodyWeightLogs(sixMonthsAgoStr, today),
    ]);

    res.json({ weeklyVolume, exerciseHistory, runTimes, bodyWeight });
  } catch (err) {
    next(err);
  }
});

export default router;
