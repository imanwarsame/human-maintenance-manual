import { Router } from 'express';
import { computeWeeklyVolumeByMuscleGroup, computeExerciseHistory, computeRunTimes } from '../db/queries/progress.js';
import { getActivitiesForDateRange } from '../db/queries/activities.js';
import { getBodyWeightLogs } from '../db/queries/bodyWeight.js';
import { getWellnessLogs } from '../db/queries/wellness.js';

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

    // Fetch activities once for the widest window and slice in memory, rather than
    // issuing three overlapping DB round-trips for the same underlying rows.
    const [activities, bodyWeight, wellness] = await Promise.all([
      getActivitiesForDateRange(sixMonthsAgoStr, today),
      getBodyWeightLogs(sixMonthsAgoStr, today),
      getWellnessLogs(sixMonthsAgoStr, today),
    ]);

    const weekActivities = activities.filter((a) => a.date >= weekStartStr && a.date <= today);
    const ninetyDayActivities = activities.filter((a) => a.date >= ninetyDaysAgoStr && a.date <= today);

    const weeklyVolume = computeWeeklyVolumeByMuscleGroup(weekActivities);
    const exerciseHistory = computeExerciseHistory(ninetyDayActivities);
    const runTimes = computeRunTimes(activities);

    res.json({ weeklyVolume, exerciseHistory, runTimes, bodyWeight, wellness });
  } catch (err) {
    next(err);
  }
});

export default router;
