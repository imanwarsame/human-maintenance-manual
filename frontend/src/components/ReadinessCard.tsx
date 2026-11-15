import { useReadiness } from '../hooks/useReadiness.ts';
import type { ReadinessBand, ReadinessComponent } from '../hooks/useReadiness.ts';

const BAND_META: Record<ReadinessBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#ef4444' },
  moderate: { label: 'Moderate', color: '#eab308' },
  good: { label: 'Good', color: '#22c55e' },
  prime: { label: 'Prime', color: '#8b5cf6' },
};

const RED = '#ef4444';
const YELLOW = '#eab308';
const GREEN = '#22c55e';
const PURPLE = '#8b5cf6';

// The bars are a display of each metric on its own scale, NOT the z-score sub_score
// the backend blends into the headline number (plotting that put "at baseline" at 50%
// and needed a ~+2.5 SD day to fill the bar).
//
// Wellness metrics use a diminishing-returns curve pivoted on the personal 28-day
// average: the bar moves fastest just either side of average (where day-to-day
// differences matter most) and flattens towards the extremes, so going from good to
// great still shows but going from great to absurd barely does. Each metric has a
// floor (bar ~empty) and a ceiling (bar ~full) that bound the curve.
interface BarScale {
  percent: number;
  color: string;
}

function scaleLinear(value: number, empty: number, full: number): number {
  return Math.min(100, Math.max(0, ((value - empty) / (full - empty)) * 100));
}

// Where the personal average sits on the bar. Above 50% so "a normal day" doesn't
// look half-empty, but with headroom so better-than-normal days are visible.
const PIVOT_PERCENT = 60;
// tanh(1.5) ≈ 0.905, so the ceiling lands at ~96% and the floor at ~6%. Values past
// them keep creeping towards 100%/0% rather than hard-clipping.
const CURVE_STEEPNESS = 1.5;

// Works for inverted metrics too: pass ceiling < floor (e.g. resting HR).
function curvePercent(value: number, pivot: number, floor: number, ceiling: number): number {
  const dir = ceiling >= floor ? 1 : -1;
  // If the average sits outside (or right on) floor/ceiling, keep a sliver of span so
  // the curve stays defined and still responds to small changes.
  const minSpan = Math.abs(ceiling - floor) * 0.05;
  const upSpan = Math.max((ceiling - pivot) * dir, minSpan);
  const downSpan = Math.max((pivot - floor) * dir, minSpan);
  const d = (value - pivot) * dir;
  if (d >= 0) return PIVOT_PERCENT + (100 - PIVOT_PERCENT) * Math.tanh((CURVE_STEEPNESS * d) / upSpan);
  return PIVOT_PERCENT - PIVOT_PERCENT * Math.tanh((CURVE_STEEPNESS * -d) / downSpan);
}

// Garmin sleep score. Colour follows Garmin's own bands (Excellent 90+, Good 80-89,
// Fair 60-79, Poor <60). Curve bounded by 40 (floor) and 95 (ceiling).
function sleepScoreBar(value: number, baseline: number | null): BarScale {
  const color = value >= 90 ? PURPLE : value >= 80 ? GREEN : value >= 60 ? YELLOW : RED;
  return { percent: curvePercent(value, baseline ?? 75, 40, 95), color };
}

// Sleep duration in minutes. Curve bounded by 5h (floor) and 9h (ceiling).
function sleepDurationBar(mins: number, baseline: number | null): BarScale {
  const h = mins / 60;
  const color = h >= 8 ? PURPLE : h >= 7 ? GREEN : h >= 6 ? YELLOW : RED;
  return { percent: curvePercent(mins, baseline ?? 420, 300, 540), color };
}

// HRV has no universal absolute range, so it's purely relative: 75% of average is
// the floor, 125% the ceiling.
function hrvBar(value: number, baseline: number): BarScale {
  const ratio = value / baseline;
  const color = ratio >= 1.1 ? PURPLE : ratio >= 0.97 ? GREEN : ratio >= 0.9 ? YELLOW : RED;
  return { percent: curvePercent(ratio, 1, 0.75, 1.25), color };
}

// Resting HR is inverted (lower is better): 112% of average is the floor, 90% the
// ceiling.
function restingHrBar(value: number, baseline: number): BarScale {
  const ratio = value / baseline;
  const color = ratio <= 0.95 ? PURPLE : ratio <= 1.03 ? GREEN : ratio <= 1.08 ? YELLOW : RED;
  return { percent: curvePercent(ratio, 1, 1.12, 0.9), color };
}

// ACWR's readiness sub_score saturates at 100 for anything up to the 1.3 "optimal"
// ceiling (low ACWR isn't penalised), so plot the raw ratio on a 0-2.0 scale,
// coloured by the same 1.3/1.8 zones the backend scores against.
function acwrBar(value: number): BarScale {
  const color = value >= 1.8 ? RED : value >= 1.3 ? YELLOW : GREEN;
  return { percent: scaleLinear(value, 0, 2.0), color };
}

// Fallback for any metric without a bespoke scale: the backend sub_score with the
// same thresholds as the overall band.
function subScoreBar(subScore: number): BarScale {
  const color = subScore < 50 ? RED : subScore < 70 ? YELLOW : subScore < 85 ? GREEN : PURPLE;
  return { percent: subScore, color };
}

function componentBar(c: ReadinessComponent): BarScale {
  switch (c.metric) {
    case 'sleep_score':
      return sleepScoreBar(c.value, c.baseline_mean);
    case 'sleep_duration_mins':
      return sleepDurationBar(c.value, c.baseline_mean);
    case 'hrv':
      return c.baseline_mean ? hrvBar(c.value, c.baseline_mean) : subScoreBar(c.sub_score);
    case 'resting_hr':
      return c.baseline_mean ? restingHrBar(c.value, c.baseline_mean) : subScoreBar(c.sub_score);
    case 'acwr':
      return acwrBar(c.value);
    default:
      return subScoreBar(c.sub_score);
  }
}

function formatSleepDuration(mins: number): string {
  const total = Math.round(mins);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${m}m`;
}

function formatComponentValue(c: ReadinessComponent): string {
  if (c.metric === 'sleep_duration_mins') {
    return c.baseline_mean != null
      ? `${formatSleepDuration(c.value)} / ${formatSleepDuration(c.baseline_mean)}`
      : formatSleepDuration(c.value);
  }
  if (c.metric === 'acwr') return c.value.toFixed(2);
  return c.baseline_mean != null ? `${c.value} / ${c.baseline_mean}` : `${c.value}`;
}

function ComponentBreakdown({ components }: { components: ReadinessComponent[] }) {
  return (
    <div className="mt-4 pt-3 border-t border-white/[.06] space-y-2.5">
      {components.map((c) => {
        const { percent, color } = componentBar(c);
        return (
          <div key={c.metric} className="flex items-center gap-3">
            <p className="w-24 shrink-0 text-xs text-ink-tertiary">{c.label}</p>
            <div className="flex-1 h-1.5 rounded-full bg-white/[.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
            </div>
            <p className="w-28 shrink-0 text-right text-xs text-ink-muted tabular-nums">
              {formatComponentValue(c)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ReadinessRing({ score, color }: { score: number; color: string }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="700" fill="#f0eee8">
        {Math.round(score)}
      </text>
    </svg>
  );
}

export default function ReadinessCard() {
  const { data, isLoading } = useReadiness();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-white/[.05]" />
        <div className="flex-1 space-y-2">
          <div className="h-2 bg-white/[.05] rounded w-1/3" />
          <div className="h-2 bg-white/[.05] rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!data || data.score == null || !data.band) {
    return <p className="text-sm text-ink-tertiary italic">Not enough wellness data yet for a readiness score.</p>;
  }

  const meta = BAND_META[data.band];
  const lowConfidence = data.confidence === 'low';
  const ringColor = lowConfidence ? '#525258' : meta.color;

  return (
    <div className={lowConfidence ? 'opacity-70' : ''}>
      <div className="flex items-center gap-4">
        <ReadinessRing score={data.score} color={ringColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-primary">Readiness</p>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
            >
              {meta.label}
            </span>
          </div>
          {lowConfidence ? (
            <p className="text-xs text-ink-muted mt-1">Limited history — still building your baseline</p>
          ) : data.drivers.length > 0 ? (
            <p className="text-xs text-ink-tertiary mt-1">{data.drivers.join(' · ')}</p>
          ) : null}
          {data.incident_reason && (
            <p className="text-xs text-ink-muted mt-0.5">Adjusted for {data.incident_reason}</p>
          )}
        </div>
      </div>
      {data.components.length > 0 && <ComponentBreakdown components={data.components} />}
    </div>
  );
}
