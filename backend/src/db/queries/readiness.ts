import { getWellnessLogs, type WellnessLog } from './wellness.js';
import { getAcwrSeries, type AcwrPoint } from './trainingLoad.js';
import { getIncidents, type HealthIncident } from './healthIncidents.js';

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

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function formatSleepDuration(mins: number): string {
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${m}m`;
}

// z is already sign-flipped for inverted metrics (e.g. resting HR), so positive
// always means "helping readiness" and negative always means "hurting" it here.
function impactTag(z: number): string {
  if (z > 0) return 'positive';
  if (z < 0) return 'negative';
  return 'neutral';
}

type WellnessMetricKey = 'hrv' | 'resting_hr' | 'sleep_score' | 'sleep_duration_mins';

interface MetricConfig {
  key: WellnessMetricKey;
  label: string;
  weight: number;
  invert: boolean;
}

// Weighted composite: hrv 30 / resting_hr 20 / sleep_score 25 / sleep_duration 10 / acwr 15
const METRIC_CONFIGS: MetricConfig[] = [
  { key: 'hrv', label: 'HRV', weight: 30, invert: false },
  { key: 'resting_hr', label: 'Resting HR', weight: 20, invert: true },
  { key: 'sleep_score', label: 'Sleep score', weight: 25, invert: false },
  { key: 'sleep_duration_mins', label: 'Sleep duration', weight: 10, invert: false },
];
const ACWR_WEIGHT = 15;

// Minimum observations to compute a self-referenced baseline at all.
const MIN_BASELINE_N = 7;
// Below this, the baseline is included but flagged as thin (drags overall confidence to 'low').
const CONFIDENT_BASELINE_N = 14;

export interface ReadinessComponent {
  metric: string;
  label: string;
  value: number;
  baseline_mean: number | null;
  baseline_n: number | null;
  z: number | null;
  sub_score: number;
  weight: number;
}

export type ReadinessBand = 'low' | 'moderate' | 'good' | 'prime';

export interface ReadinessSummary {
  date: string;
  score: number | null;
  band: ReadinessBand | null;
  confidence: 'low' | 'high';
  incident_modifier: number;
  incident_reason: string | null;
  components: ReadinessComponent[];
  drivers: string[];
}

function severityDiscount(incident: HealthIncident): number {
  if (incident.status === 'active') {
    if (incident.severity === 'severe') return 0.6;
    if (incident.severity === 'moderate') return 0.75;
    return 0.9; // mild or unspecified severity
  }
  return 0.95; // recovering
}

function resolveIncidentModifier(
  activeIncidents: HealthIncident[],
  recoveringIncidents: HealthIncident[],
): { incidentModifier: number; incidentReason: string | null } {
  const allIncidents = [...activeIncidents, ...recoveringIncidents];
  let incidentModifier = 1;
  let worstIncident: HealthIncident | null = null;
  for (const incident of allIncidents) {
    const discount = severityDiscount(incident);
    if (discount < incidentModifier) {
      incidentModifier = discount;
      worstIncident = incident;
    }
  }
  return {
    incidentModifier,
    incidentReason: worstIncident ? `${worstIncident.name} (${worstIncident.status})` : null,
  };
}

function computeReadinessForDate(
  targetDate: string,
  today: WellnessLog | undefined,
  baselineLogs: WellnessLog[],
  acwrPoint: AcwrPoint | undefined,
  incidentModifier: number,
  incidentReason: string | null,
): ReadinessSummary {
  const components: ReadinessComponent[] = [];

  for (const cfg of METRIC_CONFIGS) {
    const todayValue = today?.[cfg.key];
    if (todayValue == null) continue;
    const values = baselineLogs
      .map((w) => w[cfg.key])
      .filter((v): v is number => v != null);
    if (values.length < MIN_BASELINE_N) continue;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const sd = Math.sqrt(variance);

    let z = sd > 0 ? (todayValue - mean) / sd : 0;
    if (cfg.invert) z = -z;
    z = clamp(z, -2.5, 2.5);
    const subScore = clamp(50 + 20 * z, 0, 100);

    components.push({
      metric: cfg.key,
      label: cfg.label,
      value: todayValue,
      baseline_mean: round1(mean),
      baseline_n: values.length,
      z: round2(z),
      sub_score: round1(subScore),
      weight: cfg.weight,
    });
  }

  // ACWR sub-score is deliberately asymmetric: low ACWR means fresh, not unready,
  // so it's only penalised above the 1.3 "optimal" ceiling.
  if (acwrPoint?.acwr != null) {
    let acwrSubScore: number;
    if (acwrPoint.acwr <= 1.3) acwrSubScore = 100;
    else if (acwrPoint.acwr >= 1.8) acwrSubScore = 40;
    else acwrSubScore = 100 - ((acwrPoint.acwr - 1.3) / 0.5) * 60;

    components.push({
      metric: 'acwr',
      label: 'ACWR',
      value: acwrPoint.acwr,
      baseline_mean: null,
      baseline_n: acwrPoint.chronic_days_available,
      z: null,
      sub_score: round1(acwrSubScore),
      weight: ACWR_WEIGHT,
    });
  }

  if (components.length === 0) {
    return {
      date: targetDate,
      score: null,
      band: null,
      confidence: 'low',
      incident_modifier: 1,
      incident_reason: null,
      components: [],
      drivers: [],
    };
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedSum = components.reduce((s, c) => s + c.sub_score * c.weight, 0);
  const rawScore = weightedSum / totalWeight;

  const score = Math.round(clamp(rawScore * incidentModifier, 0, 100));
  const band: ReadinessBand = score < 50 ? 'low' : score < 70 ? 'moderate' : score < 85 ? 'good' : 'prime';

  const thinBaselines = components.filter((c) => c.baseline_n != null && c.baseline_n < CONFIDENT_BASELINE_N).length;
  const confidence: 'low' | 'high' = components.length < 3 || thinBaselines > 0 ? 'low' : 'high';

  const driverText = (c: ReadinessComponent): string => {
    const text =
      c.metric === 'sleep_duration_mins'
        ? `${c.label} ${formatSleepDuration(c.value)} vs ${formatSleepDuration(c.baseline_mean as number)} baseline`
        : `${c.label} ${c.value} vs ${c.baseline_mean} baseline`;
    return `${text} (${impactTag(c.z as number)})`;
  };

  const drivers = [...components]
    .filter((c) => c.z != null)
    .sort((a, b) => Math.abs(b.z as number) - Math.abs(a.z as number))
    .slice(0, 2)
    .map(driverText);

  // Total sleep is one of the largest weight blocks (with sleep score) but its z-score
  // rarely wins the top-2 anomaly ranking above, so surface it explicitly whenever it's
  // not already included — it's context a reader expects to see regardless of ranking.
  const sleepDuration = components.find((c) => c.metric === 'sleep_duration_mins' && c.z != null);
  if (sleepDuration && !drivers.some((d) => d.startsWith(sleepDuration.label))) {
    drivers.push(driverText(sleepDuration));
  }

  if (drivers.length === 0 && components.some((c) => c.metric === 'acwr')) {
    const acwrComponent = components.find((c) => c.metric === 'acwr')!;
    const tag = acwrComponent.sub_score < 100 ? 'negative' : 'neutral';
    drivers.push(`ACWR ${acwrComponent.value.toFixed(2)} (${tag})`);
  }

  return {
    date: targetDate,
    score,
    band,
    confidence,
    incident_modifier: incidentModifier,
    incident_reason: incidentReason,
    components,
    drivers,
  };
}

export async function getReadiness(date?: string): Promise<ReadinessSummary> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const baselineFrom = addDays(targetDate, -28);
  const baselineTo = addDays(targetDate, -1);

  const [baselineLogs, todayLogs, acwrSeries, activeIncidents, recoveringIncidents] = await Promise.all([
    getWellnessLogs(baselineFrom, baselineTo),
    getWellnessLogs(targetDate, targetDate),
    getAcwrSeries(targetDate, targetDate),
    getIncidents({ status: 'active' }),
    getIncidents({ status: 'recovering' }),
  ]);

  const { incidentModifier, incidentReason } = resolveIncidentModifier(activeIncidents, recoveringIncidents);
  return computeReadinessForDate(
    targetDate,
    todayLogs[0],
    baselineLogs,
    acwrSeries.get(targetDate),
    incidentModifier,
    incidentReason,
  );
}

// Bulk version of getReadiness for a date range. Fetches wellness logs, the ACWR series,
// and incidents once (rather than once per day) and derives each day's score in memory —
// avoids an O(days) fan-out of DB round-trips against a resource-constrained backend.
export async function getReadinessSeries(from: string, to: string): Promise<ReadinessSummary[]> {
  const dates = dateRange(from, to);
  const baselineFrom = addDays(from, -28);

  const [wellnessLogs, acwrSeries, activeIncidents, recoveringIncidents] = await Promise.all([
    getWellnessLogs(baselineFrom, to),
    getAcwrSeries(from, to),
    getIncidents({ status: 'active' }),
    getIncidents({ status: 'recovering' }),
  ]);

  const wellnessByDate = new Map(wellnessLogs.map((w) => [w.date, w]));
  const { incidentModifier, incidentReason } = resolveIncidentModifier(activeIncidents, recoveringIncidents);

  return dates.map((targetDate) => {
    const baselineFromD = addDays(targetDate, -28);
    const baselineToD = addDays(targetDate, -1);
    const baselineLogs = wellnessLogs.filter((w) => w.date >= baselineFromD && w.date <= baselineToD);
    return computeReadinessForDate(
      targetDate,
      wellnessByDate.get(targetDate),
      baselineLogs,
      acwrSeries.get(targetDate),
      incidentModifier,
      incidentReason,
    );
  });
}
