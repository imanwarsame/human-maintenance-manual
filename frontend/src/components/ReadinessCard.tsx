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

// The bars are a display of each metric on its own sensible scale, NOT the z-score
// sub_score the backend blends into the headline number. Plotting the sub_score put
// "at baseline" at 50% and needed a ~+2.5 SD day to fill the bar, so a genuinely
// excellent night (e.g. sleep score 90) read as a 60-70% bar. Each metric now has a
// range where "full" means "about as good as it realistically gets", and a colour
// scale native to that metric.
interface BarScale {
  percent: number;
  color: string;
}

function scaleLinear(value: number, empty: number, full: number): number {
  return Math.min(100, Math.max(0, ((value - empty) / (full - empty)) * 100));
}

// Garmin sleep score: absolute 0-100 with its own bands (Excellent 90+, Good 80-89,
// Fair 60-79, Poor <60). 95 fills the bar — scores above that are vanishingly rare.
function sleepScoreBar(value: number): BarScale {
  const color = value >= 90 ? PURPLE : value >= 80 ? GREEN : value >= 60 ? YELLOW : RED;
  return { percent: scaleLinear(value, 40, 95), color };
}

// Sleep duration: absolute hours, 4h empty → 9h full.
function sleepDurationBar(mins: number): BarScale {
  const h = mins / 60;
  const color = h >= 8 ? PURPLE : h >= 7 ? GREEN : h >= 6 ? YELLOW : RED;
  return { percent: scaleLinear(h, 4, 9), color };
}

// HRV has no universal absolute range, so scale against the personal baseline:
// 70% of baseline empty → 120% full (baseline sits at 60%).
function hrvBar(value: number, baseline: number): BarScale {
  const ratio = value / baseline;
  const color = ratio >= 1.1 ? PURPLE : ratio >= 0.97 ? GREEN : ratio >= 0.9 ? YELLOW : RED;
  return { percent: scaleLinear(ratio, 0.7, 1.2), color };
}

// Resting HR is inverted (lower is better): 115% of baseline empty → 90% full
// (baseline sits at 60%).
function restingHrBar(value: number, baseline: number): BarScale {
  const ratio = value / baseline;
  const color = ratio <= 0.95 ? PURPLE : ratio <= 1.03 ? GREEN : ratio <= 1.08 ? YELLOW : RED;
  return { percent: scaleLinear(ratio, 1.15, 0.9), color };
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
      return sleepScoreBar(c.value);
    case 'sleep_duration_mins':
      return sleepDurationBar(c.value);
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
