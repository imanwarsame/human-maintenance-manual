import { getActivitiesForDateRange, getEarliestActivityDate, type Activity } from './activities.js';
import { getPlanContext } from './planContext.js';

export interface HrProfile {
  max_hr: number;
  resting_hr: number;
  threshold_hr?: number;
}

const DEFAULT_HR_PROFILE: HrProfile = { max_hr: 190, resting_hr: 60 };

// Foster session-RPE style intensity defaults (1-10) by activity type, used when
// no session_rpe override and no avg_hr are available.
const TYPE_INTENSITY: Record<string, number> = {
  run: 7,
  football: 8,
  strength: 6,
  swim: 6,
  padel: 6,
  cycling: 4,
  hike: 4,
  pilates: 3,
  walk: 2,
  mobility: 2,
  rest: 0,
};
const DEFAULT_INTENSITY = 4;

async function getHrProfile(): Promise<HrProfile> {
  const raw = (await getPlanContext('hr_profile')) as Partial<HrProfile> | null;
  if (!raw?.max_hr) return DEFAULT_HR_PROFILE;
  return { ...DEFAULT_HR_PROFILE, ...raw };
}

function resolveIntensity(activity: Activity, hrProfile: HrProfile): number {
  if (activity.session_rpe != null) return activity.session_rpe;
  if (activity.avg_hr && hrProfile.max_hr) {
    const hrRatio = activity.avg_hr / hrProfile.max_hr;
    return Math.min(10, Math.max(1, (hrRatio - 0.5) / 0.045));
  }
  return TYPE_INTENSITY[activity.type.toLowerCase()] ?? DEFAULT_INTENSITY;
}

// Session load in arbitrary units: duration (mins) x intensity (1-10),
// the Foster session-RPE method that ACWR's 0.8-1.3 safety bands were validated against.
export function computeSessionLoad(activity: Activity, hrProfile: HrProfile): number {
  if (!activity.duration_mins) return 0;
  return activity.duration_mins * resolveIntensity(activity, hrProfile);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export interface DailyLoad {
  date: string;
  load: number;
  sessions: number;
}

function buildDailyLoadSeries(
  activities: Activity[],
  hrProfile: HrProfile,
  from: string,
  to: string,
): DailyLoad[] {
  const byDate = new Map<string, { load: number; sessions: number }>();
  for (const a of activities) {
    // Rest days contribute an explicit 0 via the zero-filled range below —
    // planned-but-not-yet-done sessions must not count toward actual load.
    if (a.is_planned) continue;
    const load = computeSessionLoad(a, hrProfile);
    const entry = byDate.get(a.date) ?? { load: 0, sessions: 0 };
    entry.load += load;
    entry.sessions += 1;
    byDate.set(a.date, entry);
  }
  return dateRange(from, to).map((date) => {
    const entry = byDate.get(date);
    return { date, load: entry ? round1(entry.load) : 0, sessions: entry?.sessions ?? 0 };
  });
}

export async function getDailyLoadSeries(from: string, to: string): Promise<DailyLoad[]> {
  const [activities, hrProfile] = await Promise.all([
    getActivitiesForDateRange(from, to),
    getHrProfile(),
  ]);
  return buildDailyLoadSeries(activities, hrProfile, from, to);
}

function ewma(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const lambda = 2 / (n + 1);
  return values.reduce((acc, v, i) => (i === 0 ? v : lambda * v + (1 - lambda) * acc), 0);
}

export type AcwrBand = 'undertrained' | 'optimal' | 'caution' | 'high_risk';

export interface TrainingLoadSummary {
  date: string;
  acute_7d: number;
  chronic_28d_weekly: number;
  acwr: number | null;
  acwr_ewma: number | null;
  band: AcwrBand | null;
  monotony: number | null;
  strain: number | null;
  daily_loads: DailyLoad[];
  chronic_days_available: number;
  confidence: 'low' | 'high';
  projected: { acwr_next_7d: number | null; planned_load: number };
}

export async function getTrainingLoad(date?: string): Promise<TrainingLoadSummary> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const chronicFrom = addDays(targetDate, -27);
  const projectedTo = addDays(targetDate, 7);

  const [windowActivities, hrProfile, earliest] = await Promise.all([
    getActivitiesForDateRange(chronicFrom, projectedTo),
    getHrProfile(),
    getEarliestActivityDate(),
  ]);

  const chronicSeries = buildDailyLoadSeries(windowActivities, hrProfile, chronicFrom, targetDate);
  const acuteSeries = chronicSeries.slice(-7);

  const acute_7d = round1(acuteSeries.reduce((s, d) => s + d.load, 0));
  const chronic_28d_total = chronicSeries.reduce((s, d) => s + d.load, 0);
  const chronic_28d_weekly = round1(chronic_28d_total / 4);
  const acwr = chronic_28d_weekly > 0 ? round2(acute_7d / chronic_28d_weekly) : null;

  const acuteEwma = ewma(acuteSeries.map((d) => d.load), 7);
  const chronicEwma = ewma(chronicSeries.map((d) => d.load), 28);
  const acwr_ewma = chronicEwma > 0 ? round2(acuteEwma / chronicEwma) : null;

  const daysSinceStart = earliest
    ? Math.round((new Date(targetDate).getTime() - new Date(earliest).getTime()) / 86_400_000) + 1
    : 0;
  const chronic_days_available = Math.max(0, Math.min(28, daysSinceStart));
  const confidence: 'low' | 'high' = chronic_days_available >= 21 ? 'high' : 'low';

  let band: AcwrBand | null = null;
  if (confidence === 'high' && acwr != null) {
    if (acwr < 0.8) band = 'undertrained';
    else if (acwr <= 1.3) band = 'optimal';
    else if (acwr <= 1.5) band = 'caution';
    else band = 'high_risk';
  }

  const mean7 = acute_7d / 7;
  const sd7 = Math.sqrt(acuteSeries.reduce((s, d) => s + (d.load - mean7) ** 2, 0) / 7);
  const monotony = sd7 > 0 ? round2(mean7 / sd7) : null;
  const strain = monotony != null ? round1(acute_7d * monotony) : null;

  const plannedActivities = windowActivities.filter(
    (a) => a.is_planned && a.date > targetDate && a.date <= projectedTo,
  );
  const planned_load = round1(plannedActivities.reduce((s, a) => s + computeSessionLoad(a, hrProfile), 0));
  const acwr_next_7d = chronic_28d_weekly > 0 ? round2(planned_load / chronic_28d_weekly) : null;

  return {
    date: targetDate,
    acute_7d,
    chronic_28d_weekly,
    acwr,
    acwr_ewma,
    band,
    monotony,
    strain,
    daily_loads: chronicSeries,
    chronic_days_available,
    confidence,
    projected: { acwr_next_7d, planned_load },
  };
}
