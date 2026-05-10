import type { RunPlan } from '../types/index.ts';

const INTERVAL_LABEL: Record<string, string> = {
  warmup:   'Warm-up',
  interval: 'Interval',
  recovery: 'Recovery',
  cooldown: 'Cool-down',
};

const INTERVAL_COLOR: Record<string, string> = {
  warmup:   'text-blue-400',
  interval: 'text-red-400',
  recovery: 'text-green-400',
  cooldown: 'text-blue-300',
};

interface Props {
  plan: RunPlan;
  notes: string | null;
  duration_mins: number | null;
}

export default function RunPlanCard({ plan, notes, duration_mins }: Props) {
  return (
    <div className="bg-surface-1 rounded-xl border border-blue-400/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏃</span>
          <div>
            <p className="text-sm font-semibold text-ink-primary">Run</p>
            {duration_mins && <p className="text-xs text-ink-tertiary num">{duration_mins} min</p>}
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-400 bg-blue-400/[.10] px-2 py-0.5 rounded-full border border-blue-400/20">
          Planned
        </span>
      </div>

      <div className="flex gap-4 text-center">
        <div>
          <p className="text-xl font-bold text-ink-primary num">{plan.total_distance_km} km</p>
          <p className="text-xs text-ink-tertiary">distance</p>
        </div>
        <div className="w-px bg-white/[.07]" />
        <div>
          <p className="text-xl font-bold text-ink-primary num">{plan.target_pace_min_per_km}</p>
          <p className="text-xs text-ink-tertiary">target pace /km</p>
        </div>
      </div>

      {notes && <p className="text-xs text-ink-tertiary italic">{notes}</p>}

      {plan.intervals && plan.intervals.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">Intervals</p>
          {plan.intervals.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className={`font-medium ${INTERVAL_COLOR[seg.type] ?? 'text-ink-secondary'}`}>
                {INTERVAL_LABEL[seg.type] ?? seg.type}
              </span>
              <span className="text-ink-secondary num">
                {seg.repeats && seg.repeats > 1 ? `${seg.repeats}× ` : ''}
                {seg.distance_km} km @ {seg.pace_min_per_km} /km
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
