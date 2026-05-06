import { useState } from 'react';
import { api } from '../api/client.ts';
import type { Activity } from '../types/index.ts';

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
  run: '🏃',
  cycling: '🚴',
  strength: '🏋️',
  football: '⚽',
  swim: '🏊',
  walk: '🚶',
  hike: '🥾',
};

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
      className={`bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 ${import.meta.env.DEV && activity.source === 'strava' && activity.external_id ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 capitalize">{activity.type}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">{SOURCE_LABELS[activity.source]}</span>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-gray-300 hover:text-red-400 transition-colors leading-none"
                aria-label="Delete activity"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
        <div className="flex gap-3 mt-1 text-xs text-gray-600">
          {fiveKSecs != null
            ? <span>{formatRunTime(fiveKSecs)}</span>
            : activity.duration_mins != null && <span>{activity.duration_mins} min</span>
          }
          {activity.distance_km && <span>{activity.distance_km} km</span>}
          {activity.avg_hr && <span>♥ {activity.avg_hr} bpm</span>}
        </div>
        {activity.type === 'run' && activity.raw_json && (
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
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
            {activity.raw_json.calories != null && activity.raw_json.calories > 0 && (
              <span>{activity.raw_json.calories} kcal</span>
            )}
          </div>
        )}
        {activity.notes && <p className="text-xs text-gray-400 mt-1 truncate">{activity.notes}</p>}
      </div>
    </div>
    {loading && <p className="text-xs text-gray-400 px-1">Loading Strava data...</p>}
    {rawData != null && (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(rawData, null, 2))}
          className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded px-2 py-0.5 transition-colors"
        >
          copy
        </button>
        <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-96 text-gray-700 whitespace-pre-wrap break-all">
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </div>
    )}
    </div>
  );
}
