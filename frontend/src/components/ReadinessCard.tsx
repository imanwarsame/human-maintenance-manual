import { useReadiness } from '../hooks/useReadiness.ts';
import type { ReadinessBand } from '../hooks/useReadiness.ts';

const BAND_META: Record<ReadinessBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#ef4444' },
  moderate: { label: 'Moderate', color: '#eab308' },
  good: { label: 'Good', color: '#22c55e' },
  prime: { label: 'Prime', color: '#8b5cf6' },
};

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
    <div className={`flex items-center gap-4 ${lowConfidence ? 'opacity-70' : ''}`}>
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
          <p className="text-xs text-ink-tertiary mt-1 truncate">{data.drivers.join(' · ')}</p>
        ) : null}
        {data.incident_reason && (
          <p className="text-xs text-ink-muted mt-0.5">Adjusted for {data.incident_reason}</p>
        )}
      </div>
    </div>
  );
}
