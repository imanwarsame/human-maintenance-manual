import type { RunPlan } from '../types/index.ts';

const INTERVAL_LABEL: Record<string, string> = {
  warmup: 'Warm-up',
  interval: 'Interval',
  recovery: 'Recovery',
  cooldown: 'Cool-down',
};

const INTERVAL_COLOR: Record<string, string> = {
  warmup: 'text-blue-500',
  interval: 'text-red-500',
  recovery: 'text-green-500',
  cooldown: 'text-blue-400',
};

interface Props {
  plan: RunPlan;
  notes: string | null;
  duration_mins: number | null;
}

export default function RunPlanCard({ plan, notes, duration_mins }: Props) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏃</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Run</p>
            {duration_mins && <p className="text-xs text-gray-400">{duration_mins} min</p>}
          </div>
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          Planned
        </span>
      </div>

      <div className="flex gap-4 text-center">
        <div>
          <p className="text-xl font-bold text-gray-800">{plan.total_distance_km} km</p>
          <p className="text-xs text-gray-400">distance</p>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <p className="text-xl font-bold text-gray-800">{plan.target_pace_min_per_km}</p>
          <p className="text-xs text-gray-400">target pace /km</p>
        </div>
      </div>

      {notes && <p className="text-xs text-gray-500 italic">{notes}</p>}

      {plan.intervals && plan.intervals.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Intervals</p>
          {plan.intervals.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className={`font-medium ${INTERVAL_COLOR[seg.type] ?? 'text-gray-600'}`}>
                {INTERVAL_LABEL[seg.type] ?? seg.type}
              </span>
              <span className="text-gray-600">
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
