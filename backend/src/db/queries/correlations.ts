import { getWellnessLogs } from './wellness.js';
import { getDailyLoadSeries } from './trainingLoad.js';
import { getReadinessSeries } from './readiness.js';
import { getHydrationForDateRange } from './hydration.js';
import { getMealPlansForDateRange } from './meals.js';
import { getBodyWeightLogs } from './bodyWeight.js';

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
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

interface DailyMatrixRow {
  date: string;
  sleep_duration_mins: number | null;
  sleep_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  steps: number | null;
  training_load: number | null;
  readiness_score: number | null;
  acwr: number | null;
  hydration_ml: number | null;
  protein_g: number | null;
  kcal: number | null;
  body_weight_kg: number | null;
  body_weight_7d_ma: number | null;
}

async function buildDailyMatrix(from: string, to: string): Promise<DailyMatrixRow[]> {
  // Pad back 7 days so the trailing moving average is available from `from` onward.
  const paddedFrom = addDays(from, -7);

  const [wellness, loadSeries, readinessSeries, hydrationLogs, meals, weightLogs] = await Promise.all([
    getWellnessLogs(from, to),
    getDailyLoadSeries(from, to),
    getReadinessSeries(from, to),
    getHydrationForDateRange(from, to),
    getMealPlansForDateRange(from, to),
    getBodyWeightLogs(paddedFrom, to),
  ]);

  const wellnessByDate = new Map(wellness.map((w) => [w.date, w]));
  const loadByDate = new Map(loadSeries.map((d) => [d.date, d.load]));
  const readinessByDate = new Map(readinessSeries.map((r) => [r.date, r]));
  const weightByDate = new Map(weightLogs.map((w) => [w.date, w.weight_kg]));

  const hydrationByDate = new Map<string, number>();
  for (const log of hydrationLogs) {
    hydrationByDate.set(log.date, (hydrationByDate.get(log.date) ?? 0) + log.amount_ml);
  }

  const mealsByDate = new Map<string, { protein: number; kcal: number }>();
  for (const m of meals) {
    if (!m.completion) continue;
    const entry = mealsByDate.get(m.date) ?? { protein: 0, kcal: 0 };
    entry.protein += m.protein_g ?? 0;
    entry.kcal += m.kcal ?? 0;
    mealsByDate.set(m.date, entry);
  }

  return dateRange(from, to).map((date) => {
    const w = wellnessByDate.get(date);
    const r = readinessByDate.get(date);
    const acwrComponent = r?.components.find((c) => c.metric === 'acwr');
    const meal = mealsByDate.get(date);

    const windowWeights: number[] = [];
    for (let i = 0; i < 7; i++) {
      const w2 = weightByDate.get(addDays(date, -i));
      if (w2 != null) windowWeights.push(w2);
    }
    const bodyWeight7dMa =
      windowWeights.length >= 3 ? round1(windowWeights.reduce((s, v) => s + v, 0) / windowWeights.length) : null;

    return {
      date,
      sleep_duration_mins: w?.sleep_duration_mins ?? null,
      sleep_score: w?.sleep_score ?? null,
      hrv: w?.hrv ?? null,
      resting_hr: w?.resting_hr ?? null,
      steps: w?.steps ?? null,
      training_load: loadByDate.get(date) ?? null,
      readiness_score: r?.score ?? null,
      acwr: acwrComponent?.value ?? null,
      hydration_ml: hydrationByDate.get(date) ?? null,
      protein_g: meal?.protein ?? null,
      kcal: meal?.kcal ?? null,
      body_weight_kg: weightByDate.get(date) ?? null,
      body_weight_7d_ma: bodyWeight7dMa,
    };
  });
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom > 0 ? num / denom : 0;
}

// Numerical Recipes-style incomplete beta function, used to get an exact
// two-tailed p-value for Pearson's r from Student's t distribution.
function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of cof) {
    y += 1;
    ser += c / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 100;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function tTestPValue(t: number, df: number): number {
  return betai(df / 2, 0.5, df / (df + t * t));
}

function pearsonPValue(r: number, n: number): number {
  const df = n - 2;
  if (df <= 0) return 1;
  const denom = 1 - r * r;
  if (denom <= 0) return 0;
  const t = Math.abs(r) * Math.sqrt(df / denom);
  return tTestPValue(t, df);
}

// Holm-Bonferroni step-down correction across the whole tested pair set.
function holmBonferroni(pValues: number[]): number[] {
  const m = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array(m).fill(1);
  let runningMax = 0;
  indexed.forEach(({ p, i }, rank) => {
    const adj = Math.min(1, p * (m - rank));
    runningMax = Math.max(runningMax, adj);
    adjusted[i] = runningMax;
  });
  return adjusted;
}

type MetricKey = Exclude<keyof DailyMatrixRow, 'date'>;

interface PairDef {
  x: MetricKey;
  y: MetricKey;
  lagDays: number;
  label: string;
}

// Directional, lagged pairs — lag is what makes a result a claim rather than a same-day coincidence.
const PAIRS: PairDef[] = [
  { x: 'sleep_duration_mins', y: 'hrv', lagDays: 1, label: 'Sleep duration → next-day HRV' },
  { x: 'sleep_score', y: 'readiness_score', lagDays: 1, label: 'Sleep score → next-day readiness' },
  { x: 'training_load', y: 'hrv', lagDays: 1, label: 'Training load → next-day HRV' },
  { x: 'training_load', y: 'resting_hr', lagDays: 1, label: 'Training load → next-day resting HR' },
  { x: 'hydration_ml', y: 'readiness_score', lagDays: 1, label: 'Hydration → next-day readiness' },
  { x: 'hydration_ml', y: 'training_load', lagDays: 0, label: 'Hydration → same-day training load' },
  { x: 'readiness_score', y: 'training_load', lagDays: 0, label: 'Readiness → same-day training load' },
  { x: 'protein_g', y: 'readiness_score', lagDays: 1, label: 'Protein intake → next-day readiness' },
  { x: 'kcal', y: 'body_weight_7d_ma', lagDays: 7, label: 'Calorie intake → body weight a week later' },
  { x: 'steps', y: 'sleep_score', lagDays: 0, label: 'Steps → same-day sleep score' },
  { x: 'acwr', y: 'resting_hr', lagDays: 0, label: 'ACWR → same-day resting HR' },
  { x: 'sleep_duration_mins', y: 'training_load', lagDays: 1, label: 'Sleep duration → next-day training load' },
];

const MIN_N = 14;
const MIN_ABS_R = 0.4;
const ALPHA = 0.05;

export interface CorrelationResult {
  x: string;
  y: string;
  label: string;
  lag_days: number;
  n: number;
  r: number | null;
  p_adjusted: number | null;
  significant: boolean;
  reason: string | null;
}

export async function getCorrelations(days = 180): Promise<CorrelationResult[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = addDays(to, -days);
  const matrix = await buildDailyMatrix(from, to);
  const byDate = new Map(matrix.map((row) => [row.date, row]));

  const rawResults = PAIRS.map((pair) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const row of matrix) {
      const yRow = byDate.get(addDays(row.date, pair.lagDays));
      const xVal = row[pair.x];
      const yVal = yRow?.[pair.y];
      if (typeof xVal === 'number' && typeof yVal === 'number') {
        xs.push(xVal);
        ys.push(yVal);
      }
    }
    if (xs.length < MIN_N) {
      return { pair, n: xs.length, r: null as number | null, p: null as number | null, reason: `needs ${MIN_N} days of paired data, have ${xs.length}` };
    }
    if (new Set(xs).size <= 1 || new Set(ys).size <= 1) {
      return { pair, n: xs.length, r: null as number | null, p: null as number | null, reason: 'not enough variation in one of the metrics' };
    }
    const r = pearson(xs, ys);
    const p = pearsonPValue(r, xs.length);
    return { pair, n: xs.length, r, p, reason: null as string | null };
  });

  const testableIndices = rawResults
    .map((res, idx) => ({ res, idx }))
    .filter(({ res }) => res.r != null && res.p != null);
  const adjustedPValues = holmBonferroni(testableIndices.map(({ res }) => res.p as number));
  const adjustedByIndex = new Map<number, number>();
  testableIndices.forEach(({ idx }, i) => adjustedByIndex.set(idx, adjustedPValues[i]));

  return rawResults.map((res, idx) => {
    const pAdjusted = adjustedByIndex.get(idx) ?? null;
    const meetsStrength = res.r != null && Math.abs(res.r) >= MIN_ABS_R;
    const significant = res.r != null && pAdjusted != null && pAdjusted < ALPHA && meetsStrength;
    let reason = res.reason;
    if (!reason && res.r != null && !significant) {
      reason = !meetsStrength ? 'correlation too weak to be meaningful' : 'not statistically significant after correction';
    }
    return {
      x: res.pair.x,
      y: res.pair.y,
      label: res.pair.label,
      lag_days: res.pair.lagDays,
      n: res.n,
      r: res.r != null ? round2(res.r) : null,
      p_adjusted: pAdjusted != null ? round3(pAdjusted) : null,
      significant,
      reason: significant ? null : reason,
    };
  });
}
