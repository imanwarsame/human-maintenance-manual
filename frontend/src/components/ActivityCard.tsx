import type { Activity } from '../types/index.ts';

const SOURCE_LABELS: Record<string, string> = {
  strava: 'Strava',
  garmin: 'Garmin',
  manual: 'Manual',
};

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
}

export default function ActivityCard({ activity }: Props) {
  const icon = TYPE_ICONS[activity.type] ?? '🏅';
  const date = new Date(activity.date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 capitalize">{activity.type}</p>
          <span className="text-xs text-gray-400 shrink-0">{SOURCE_LABELS[activity.source]}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
        <div className="flex gap-3 mt-1 text-xs text-gray-600">
          {activity.duration_mins && <span>{activity.duration_mins} min</span>}
          {activity.distance_km && <span>{activity.distance_km} km</span>}
          {activity.avg_hr && <span>{activity.avg_hr} bpm avg</span>}
        </div>
        {activity.notes && <p className="text-xs text-gray-400 mt-1 truncate">{activity.notes}</p>}
      </div>
    </div>
  );
}
