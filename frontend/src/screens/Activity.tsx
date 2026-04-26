import { useState } from 'react';
import { useActivities, useLogActivity } from '../hooks/useActivities.ts';
import ActivityCard from '../components/ActivityCard.tsx';

const ACTIVITY_TYPES = ['run', 'strength', 'cycling', 'football', 'swim', 'walk', 'hike', 'other'];

export default function Activity() {
  const { data: activities, isLoading } = useActivities();
  const { mutate: logActivity, isPending } = useLogActivity();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'run',
    duration_mins: '',
    distance_km: '',
    avg_hr: '',
    notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    logActivity(
      {
        date: form.date,
        type: form.type,
        duration_mins: form.duration_mins ? Number(form.duration_mins) : undefined,
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
        avg_hr: form.avg_hr ? Number(form.avg_hr) : undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: () => setShowForm(false) }
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Activity</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {showForm ? 'Cancel' : '+ Manual entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Log activity</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 45"
                value={form.duration_mins}
                onChange={(e) => setForm({ ...form, duration_mins: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Distance (km)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 5.0"
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Avg HR (bpm)</label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 145"
                value={form.avg_hr}
                onChange={(e) => setForm({ ...form, avg_hr: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <input
              type="text"
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : 'Log activity'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />)}
        </div>
      ) : activities?.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No activities yet. Connect Strava or log one manually.
        </p>
      ) : (
        <div className="space-y-3">
          {activities?.map((a) => <ActivityCard key={a.id} activity={a} />)}
        </div>
      )}
    </div>
  );
}
