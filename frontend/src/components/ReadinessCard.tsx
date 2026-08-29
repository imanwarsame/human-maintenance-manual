import { useReadiness } from '../hooks/useReadiness.ts';
import type { ReadinessBand, ReadinessComponent } from '../hooks/useReadiness.ts';

const BAND_META: Record<ReadinessBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#ef4444' },
  moderate: { label: 'Moderate', color: '#eab308' },
  good: { label: 'Good', color: '#22c55e' },
  prime: { label: 'Prime', color: '#8b5cf6' },
};

// Same thresholds as the overall band, applied per-metric so the breakdown
// bars read in the same color language as the headline score.
function subScoreColor(subScore: number): string {
  if (subScore < 50) return '#ef4444';
  if (subScore < 70) return '#eab308';
  if (subScore < 85) return '#22c55e';
  return '#8b5cf6';
}

// ACWR's readiness sub_score deliberately saturates at 100 for any value up to the
// 1.3 "optimal" ceiling (low ACWR isn't penalised), which would pin this bar full and
// purple across most of its real-world range. So the bar plots the raw ratio on its
// own 0-2.0 scale instead, colored by the same 1.3/1.8 zones the backend scores against.
const ACWR_BAR_MAX = 2.0;
function acwrBarPercent(value: number): number {
  return Math.min(100, Math.max(0, (value / ACWR_BAR_MAX) * 100));
}
function acwrBarColor(value: number): string {
  if (value >= 1.8) return '#ef4444';
  if (value >= 1.3) return '#eab308';
  return '#22c55e';
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
        const isAcwr = c.metric === 'acwr';
        const percent = isAcwr ? acwrBarPercent(c.value) : c.sub_score;
        const color = isAcwr ? acwrBarColor(c.value) : subScoreColor(c.sub_score);
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
