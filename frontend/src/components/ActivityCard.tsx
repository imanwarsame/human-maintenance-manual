import { useState, useCallback } from 'react';
import { api } from '../api/client.ts';
import type { Activity, Exercise } from '../types/index.ts';

const SOURCE_LABELS: Record<string, string> = {
  strava: 'Strava',
  garmin: 'Garmin',
  manual: 'Manual',
};

function formatPace(speedMs: number): string {
  const secsPerKm = 1000 / speedMs;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatRunTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const TYPE_ICONS: Record<string, string> = {
  run:      '🏃',
  cycling:  '🚴',
  strength: '🏋️',
  football: '⚽',
  swim:     '🏊',
  walk:     '🚶',
  hike:     '🥾',
};

function ExerciseLog({ activityId, exercises }: { activityId: string; exercises: Exercise[] }) {
  const [completed, setCompleted] = useState<Set<number>>(() => {
    const init = new Set<number>();
    exercises.forEach((ex, i) => { if (ex.completed) init.add(i); });
    return init;
  });

  const persist = useCallback(
    (nextCompleted: Set<number>) => {
      const updated = exercises.map((ex, idx) => ({
        ...ex,
        completed: nextCompleted.has(idx),
        skipped: false,
      }));
      api.patch(`/api/activities/${activityId}`, { exercises: updated }).catch(() => {});
    },
    [activityId, exercises],
  );

  function toggle(i: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      persist(next);
      return next;
    });
  }

  const done = completed.size;

  return (
    <div className="space-y-1.5 pt-1 border-t border-white/[.06]">
      <p className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
        Exercises · <span className="num">{done}/{exercises.length}</span>
      </p>
      {exercises.map((ex, i) => {
        const isDone = completed.has(i);
        return (
          <div key={i} className="flex items-center gap-2 w-full">
            <button
              onClick={(e) => { e.stopPropagation(); toggle(i); }}
              className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                isDone
                  ? 'border-brand-500 bg-brand-500'
                  : 'border-white/[.2] hover:border-brand-500/50'
              }`}
            >
              {isDone && (
                <span className="text-surface-0 text-[8px] leading-none font-bold">✓</span>
              )}
            </button>
            <span className={`text-xs flex-1 min-w-0 transition-colors ${isDone ? 'line-through text-ink-muted' : 'text-ink-secondary'}`}>
              {ex.name}
            </span>
            <span className="text-[11px] text-ink-tertiary shrink-0 num">{ex.sets}×{ex.reps}</span>
            {ex.weight_kg && (
              <span className="text-[11px] text-ink-tertiary shrink-0 num">{ex.weight_kg} kg</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  activity: Activity;
  onDelete?: () => void;
}

export default function ActivityCard({ activity, onDelete }: Props) {
  const [rawData, setRawData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!import.meta.env.DEV) return;
    if (activity.source !== 'strava' || !activity.external_id) return;
    if (rawData) { setRawData(null); return; }
    setLoading(true);
    try {
      const data = await api.get(`/api/activities/strava-raw/${activity.external_id}`);
      setRawData(data);
    } finally {
      setLoading(false);
    }
  }

  const icon = TYPE_ICONS[activity.type] ?? '🏅';
  const date = new Date(activity.date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const fiveKEffort = activity.type === 'run'
    ? activity.raw_json?.best_efforts?.find((e) => /^(best )?5k$/i.test(e.name.trim()))
    : undefined;
  const isFiveKRun = activity.type === 'run' &&
    activity.distance_km != null &&
    activity.distance_km >= 4.8 &&
    activity.distance_km <= 5.2;
  const fiveKSecs = fiveKEffort?.elapsed_time ??
    (isFiveKRun && activity.raw_json?.elapsed_time != null ? activity.raw_json.elapsed_time : undefined);

  return (
    <div
      className={`bg-surface-1 rounded-xl border border-white/[.07] p-4 flex flex-col gap-3 transition-all duration-150 ${
        import.meta.env.DEV && activity.source === 'strava' && activity.external_id
          ? 'cursor-pointer hover:border-white/[.12]'
          : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink-primary capitalize">{activity.type}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-ink-muted">{SOURCE_LABELS[activity.source]}</span>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-ink-muted hover:text-red-400 transition-colors leading-none text-base active:scale-90"
                  aria-label="Delete activity"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-tertiary mt-0.5">{date}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-ink-secondary num">
            {fiveKSecs != null
              ? <span>{formatRunTime(fiveKSecs)}</span>
              : (() => {
                  const movingSecs = activity.raw_json?.moving_time;
                  const mins = movingSecs != null
                    ? Math.round(movingSecs / 60)
                    : activity.duration_mins;
                  return mins != null ? <span>{mins} min</span> : null;
                })()
            }
            {activity.distance_km && <span>{activity.distance_km} km</span>}
            {activity.avg_hr && <span>♥ {activity.avg_hr} bpm</span>}
            {activity.raw_json?.calories != null && activity.raw_json.calories > 0 && (
              <span>{Math.round(activity.raw_json.calories)} kcal</span>
            )}
          </div>
          {activity.type === 'run' && activity.raw_json && (
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-ink-tertiary num">
              {activity.raw_json.average_speed != null && activity.raw_json.average_speed > 0 && (
                <span>{formatPace(activity.raw_json.average_speed)} /km</span>
              )}
              {activity.raw_json.average_cadence != null && (
                <span>{Math.round(activity.raw_json.average_cadence * 2)} spm</span>
              )}
              {activity.raw_json.total_elevation_gain != null && activity.raw_json.total_elevation_gain > 0 && (
                <span>{Math.round(activity.raw_json.total_elevation_gain)}m ↑</span>
              )}
              {activity.raw_json.max_heartrate != null && (
                <span>♥ {activity.raw_json.max_heartrate} max</span>
              )}
            </div>
          )}
          {activity.notes && <p className="text-xs text-ink-muted mt-1 truncate">{activity.notes}</p>}
        </div>
      </div>
      {activity.raw_json?.exercises && activity.raw_json.exercises.length > 0 && (
        <ExerciseLog activityId={activity.id} exercises={activity.raw_json.exercises} />
      )}
      {loading && <p className="text-xs text-ink-tertiary px-1">Loading Strava data…</p>}
      {rawData != null && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(rawData, null, 2))}
            className="absolute top-2 right-2 text-xs text-ink-tertiary hover:text-ink-primary bg-surface-2 hover:bg-surface-3 rounded px-2 py-0.5 transition-colors"
          >
            copy
          </button>
          <pre className="text-xs bg-surface-2 border border-white/[.07] rounded-lg p-3 overflow-x-auto max-h-96 text-ink-secondary whitespace-pre-wrap break-all">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
