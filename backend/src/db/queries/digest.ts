import { getTrainingLoad } from './trainingLoad.js';
import { getReadinessSeries } from './readiness.js';
import { getWellnessLogs } from './wellness.js';
import { getMealPlansForDateRange } from './meals.js';
import { getHydrationForDateRange } from './hydration.js';
import { getBodyWeightLogs } from './bodyWeight.js';
import { getIncidents, type HealthIncident } from './healthIncidents.js';
import { getActivitiesForDateRange } from './activities.js';
import { getWeeklyVolumeByMuscleGroup, type VolumeByMuscle } from './progress.js';
import { getCoachingNotesForDateRange, type CoachingNote } from './coaching.js';
import { getPlanContext } from './planContext.js';

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateCount(from: string, to: string): number {
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / 86_400_000) + 1;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((s, v) => s + v, 0) / values.length);
}

export interface WeeklyDigestBundle {
  period: { from: string; to: string };
  prior_period: { from: string; to: string };
  training: {
    acwr_now: number | null;
    acwr_prior: number | null;
    weekly_load_now: number;
    weekly_load_prior: number;
    band_now: string | null;
    monotony_now: number | null;
    strain_now: number | null;
    volume_by_muscle: VolumeByMuscle[];
  };
  readiness: {
    avg_now: number | null;
    avg_prior: number | null;
    best_day: { date: string; score: number } | null;
    worst_day: { date: string; score: number } | null;
    series: { date: string; score: number | null; band: string | null }[];
  };
  wellness: {
    avg_hrv_now: number | null;
    avg_hrv_prior: number | null;
    avg_resting_hr_now: number | null;
    avg_resting_hr_prior: number | null;
    avg_sleep_mins_now: number | null;
    avg_sleep_mins_prior: number | null;
    avg_sleep_score_now: number | null;
    avg_sleep_score_prior: number | null;
    days_present_now: number;
    days_present_prior: number;
  };
  nutrition: {
    meal_completion_pct: number;
    total_meals: number;
    completed_meals: number;
    avg_kcal_eaten: number | null;
    avg_protein_g: number | null;
    avg_carbs_g: number | null;
    avg_fat_g: number | null;
    macro_targets: unknown;
  };
  hydration: {
    avg_ml: number;
    days_hit_target: number;
    total_days: number;
    target_ml: number | null;
  };
  body_comp: {
    start_weight_kg: number | null;
    end_weight_kg: number | null;
    delta_kg: number | null;
  };
  incidents: {
    open: HealthIncident[];
    resolved_this_week: HealthIncident[];
  };
  prior_weekly_note: CoachingNote | null;
  daily_notes_this_week: CoachingNote[];
  data_quality: {
    wellness_days_present: number;
    wellness_days_total: number;
    activities_missing_hr: number;
    confidence: 'low' | 'high';
  };
}

export async function getWeeklyDigestBundle(from: string, to: string): Promise<WeeklyDigestBundle> {
  const periodDays = dateCount(from, to);
  const priorTo = addDays(from, -1);
  const priorFrom = addDays(priorTo, -(periodDays - 1));

  const [
    loadNow,
    loadPrior,
    readinessSeriesNow,
    readinessSeriesPrior,
    wellnessNow,
    wellnessPrior,
    meals,
    hydrationLogs,
    bodyWeights,
    activeIncidents,
    recoveringIncidents,
    resolvedIncidents,
    volumeByMuscle,
    priorNotesWindow,
    thisWeekNotes,
    macroTargets,
    hydrationTargetMl,
    activitiesInPeriod,
  ] = await Promise.all([
    getTrainingLoad(to),
    getTrainingLoad(priorTo),
    getReadinessSeries(from, to),
    getReadinessSeries(priorFrom, priorTo),
    getWellnessLogs(from, to),
    getWellnessLogs(priorFrom, priorTo),
    getMealPlansForDateRange(from, to),
    getHydrationForDateRange(from, to),
    getBodyWeightLogs(addDays(from, -7), to),
    getIncidents({ status: 'active' }),
    getIncidents({ status: 'recovering' }),
    getIncidents({ status: 'resolved' }),
    getWeeklyVolumeByMuscleGroup(from, to),
    getCoachingNotesForDateRange(addDays(from, -35), addDays(from, -1)),
    getCoachingNotesForDateRange(from, to),
    getPlanContext('macro_targets'),
    getPlanContext('hydration_target_ml'),
    getActivitiesForDateRange(from, to),
  ]);

  const scoredNow = readinessSeriesNow.filter((r): r is typeof r & { score: number } => r.score != null);
  const scoredPrior = readinessSeriesPrior.filter((r): r is typeof r & { score: number } => r.score != null);
  const bestDay = scoredNow.length
    ? scoredNow.reduce((a, b) => (b.score > a.score ? b : a))
    : null;
  const worstDay = scoredNow.length
    ? scoredNow.reduce((a, b) => (b.score < a.score ? b : a))
    : null;

  const resolvedThisWeek = resolvedIncidents.filter(
    (i) => i.resolved_date && i.resolved_date >= from && i.resolved_date <= to,
  );

  const priorWeeklyNote =
    priorNotesWindow
      .filter((n) => n.note_type === 'weekly')
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop() ?? null;
  const dailyNotesThisWeek = thisWeekNotes.filter((n) => n.note_type === 'daily');

  const completedMeals = meals.filter((m) => m.completion !== null);
  const meal_completion_pct = meals.length > 0 ? round1((completedMeals.length / meals.length) * 100) : 0;

  const dailyMacroTotals = Array.from({ length: periodDays }, (_, i) => {
    const date = addDays(from, i);
    const dayMeals = completedMeals.filter((m) => m.date === date);
    return {
      kcal: dayMeals.reduce((s, m) => s + (m.kcal ?? 0), 0),
      protein_g: dayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0),
      carbs_g: dayMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0),
      fat_g: dayMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0),
    };
  });

  const hydrationByDate = new Map<string, number>();
  for (const log of hydrationLogs) {
    hydrationByDate.set(log.date, (hydrationByDate.get(log.date) ?? 0) + log.amount_ml);
  }
  const totalMl = [...hydrationByDate.values()].reduce((s, v) => s + v, 0);
  const targetMl = typeof hydrationTargetMl === 'number' ? hydrationTargetMl : null;
  const daysHitTarget = targetMl != null ? [...hydrationByDate.values()].filter((v) => v >= targetMl).length : 0;

  const beforePeriod = bodyWeights.filter((w) => w.date < from);
  const withinPeriod = bodyWeights.filter((w) => w.date >= from && w.date <= to);
  const startEntry = beforePeriod.length > 0 ? beforePeriod[beforePeriod.length - 1] : withinPeriod[0] ?? null;
  const endEntry = withinPeriod.length > 0 ? withinPeriod[withinPeriod.length - 1] : startEntry;

  const actualActivities = activitiesInPeriod.filter((a) => !a.is_planned);
  const activitiesMissingHr = actualActivities.filter((a) => a.avg_hr == null).length;
  const wellnessDaysPresent = wellnessNow.filter(
    (w) => w.hrv != null || w.resting_hr != null || w.sleep_score != null,
  ).length;

  return {
    period: { from, to },
    prior_period: { from: priorFrom, to: priorTo },
    training: {
      acwr_now: loadNow.acwr,
      acwr_prior: loadPrior.acwr,
      weekly_load_now: loadNow.acute_7d,
      weekly_load_prior: loadPrior.acute_7d,
      band_now: loadNow.band,
      monotony_now: loadNow.monotony,
      strain_now: loadNow.strain,
      volume_by_muscle: volumeByMuscle,
    },
    readiness: {
      avg_now: avg(scoredNow.map((r) => r.score)),
      avg_prior: avg(scoredPrior.map((r) => r.score)),
      best_day: bestDay ? { date: bestDay.date, score: bestDay.score } : null,
      worst_day: worstDay ? { date: worstDay.date, score: worstDay.score } : null,
      series: readinessSeriesNow.map((r) => ({ date: r.date, score: r.score, band: r.band })),
    },
    wellness: {
      avg_hrv_now: avg(wellnessNow.map((w) => w.hrv).filter((v): v is number => v != null)),
      avg_hrv_prior: avg(wellnessPrior.map((w) => w.hrv).filter((v): v is number => v != null)),
      avg_resting_hr_now: avg(wellnessNow.map((w) => w.resting_hr).filter((v): v is number => v != null)),
      avg_resting_hr_prior: avg(wellnessPrior.map((w) => w.resting_hr).filter((v): v is number => v != null)),
      avg_sleep_mins_now: avg(wellnessNow.map((w) => w.sleep_duration_mins).filter((v): v is number => v != null)),
      avg_sleep_mins_prior: avg(
        wellnessPrior.map((w) => w.sleep_duration_mins).filter((v): v is number => v != null),
      ),
      avg_sleep_score_now: avg(wellnessNow.map((w) => w.sleep_score).filter((v): v is number => v != null)),
      avg_sleep_score_prior: avg(wellnessPrior.map((w) => w.sleep_score).filter((v): v is number => v != null)),
      days_present_now: wellnessDaysPresent,
      days_present_prior: wellnessPrior.filter(
        (w) => w.hrv != null || w.resting_hr != null || w.sleep_score != null,
      ).length,
    },
    nutrition: {
      meal_completion_pct,
      total_meals: meals.length,
      completed_meals: completedMeals.length,
      avg_kcal_eaten: avg(dailyMacroTotals.map((d) => d.kcal)),
      avg_protein_g: avg(dailyMacroTotals.map((d) => d.protein_g)),
      avg_carbs_g: avg(dailyMacroTotals.map((d) => d.carbs_g)),
      avg_fat_g: avg(dailyMacroTotals.map((d) => d.fat_g)),
      macro_targets: macroTargets,
    },
    hydration: {
      avg_ml: periodDays > 0 ? Math.round(totalMl / periodDays) : 0,
      days_hit_target: daysHitTarget,
      total_days: periodDays,
      target_ml: targetMl,
    },
    body_comp: {
      start_weight_kg: startEntry?.weight_kg ?? null,
      end_weight_kg: endEntry?.weight_kg ?? null,
      delta_kg:
        startEntry && endEntry ? round1(endEntry.weight_kg - startEntry.weight_kg) : null,
    },
    incidents: {
      open: [...activeIncidents, ...recoveringIncidents],
      resolved_this_week: resolvedThisWeek,
    },
    prior_weekly_note: priorWeeklyNote,
    daily_notes_this_week: dailyNotesThisWeek,
    data_quality: {
      wellness_days_present: wellnessDaysPresent,
      wellness_days_total: periodDays,
      activities_missing_hr: activitiesMissingHr,
      confidence: wellnessDaysPresent >= periodDays - 1 ? 'high' : 'low',
    },
  };
}
