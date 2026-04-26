import { useState } from 'react';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { useLogActivity } from '../hooks/useActivities.ts';
import ActivityCard from '../components/ActivityCard.tsx';
import WorkoutPlanCard from '../components/WorkoutPlanCard.tsx';
import RunPlanCard from '../components/RunPlanCard.tsx';
import type { Activity } from '../types/index.ts';

const ACTIVITY_TYPES = ['run', 'strength', 'cycling', 'football', 'swim', 'walk', 'hike', 'other'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const TODAY = toDateStr(new Date());

function DayActivityDots({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;
  return (
    <div className="flex gap-0.5 justify-center mt-0.5">
      {activities.slice(0, 3).map((a, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${a.is_planned ? 'border border-brand-400' : 'bg-brand-400'}`}
          title={a.type}
        />
      ))}
    </div>
  );
}

function DayDetail({ date, activities }: { date: string; activities: Activity[] }) {
  const dayActivities = activities.filter((a) => a.date === date);
  const isPast = date < TODAY;
  const isFut = date > TODAY;

  if (dayActivities.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        {isFut ? 'No workout planned for this day.' : isPast ? 'No activity recorded.' : 'No activity yet today.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {dayActivities.map((a) => {
        if (a.is_planned) {
          if (a.type === 'run' && a.raw_json?.run_plan) {
            return (
              <RunPlanCard
                key={a.id}
                plan={a.raw_json.run_plan}
                notes={a.notes}
                duration_mins={a.duration_mins}
              />
            );
          }
          return (
            <WorkoutPlanCard
              key={a.id}
              type={a.type}
              notes={a.notes}
              duration_mins={a.duration_mins}
              exercises={a.raw_json?.exercises ?? []}
            />
          );
        }
        return <ActivityCard key={a.id} activity={a} />;
      })}
    </div>
  );
}

export default function Activity() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: TODAY,
    type: 'run',
    duration_mins: '',
    distance_km: '',
    avg_hr: '',
    notes: '',
  });

  const { mutate: logActivity, isPending } = useLogActivity();

  const weekDays = getWeekDays(weekOffset);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

  const now = new Date();
  const monthYear = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthDays = getMonthDays(monthYear.getFullYear(), monthYear.getMonth());
  const monthStart = toDateStr(new Date(monthYear.getFullYear(), monthYear.getMonth(), 1));
  const monthEnd = toDateStr(new Date(monthYear.getFullYear(), monthYear.getMonth() + 1, 0));

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  const { data: activities = [], isLoading } = useActivitiesForDateRange(rangeStart, rangeEnd);

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

  const weekLabel = (() => {
    const s = weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const e = weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const monthLabel = monthYear.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Activity</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                  viewMode === v ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {showForm ? 'Cancel' : '+ Log'}
          </button>
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1 rounded hover:bg-gray-100">‹</button>
            <button
              onClick={() => { setWeekOffset(0); setSelectedDate(TODAY); }}
              className="font-medium hover:text-brand-600 transition-colors"
            >
              {weekLabel}
            </button>
            <button onClick={() => setWeekOffset((o) => o + 1)} className="p-1 rounded hover:bg-gray-100">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const str = toDateStr(d);
              const dayActivities = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1.5 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">
                    {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                  </span>
                  <span>{d.getDate()}</span>
                  {dayActivities.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayActivities.slice(0, 2).map((a, i) => (
                        <span
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            isSelected ? 'bg-white' : a.is_planned ? 'border border-brand-400' : 'bg-brand-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button onClick={() => setMonthOffset((o) => o - 1)} className="p-1 rounded hover:bg-gray-100">‹</button>
            <button
              onClick={() => { setMonthOffset(0); setSelectedDate(TODAY); }}
              className="font-medium hover:text-brand-600 transition-colors"
            >
              {monthLabel}
            </button>
            <button onClick={() => setMonthOffset((o) => o + 1)} className="p-1 rounded hover:bg-gray-100">›</button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <p key={i} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</p>
            ))}
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toDateStr(d);
              const dayActivities = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>{d.getDate()}</span>
                  <DayActivityDots activities={dayActivities} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Selected day detail */}
      {!isLoading && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <DayDetail date={selectedDate} activities={activities} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />)}
        </div>
      )}

      {/* Manual log form */}
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
                type="number" min={1} placeholder="e.g. 45"
                value={form.duration_mins}
                onChange={(e) => setForm({ ...form, duration_mins: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Distance (km)</label>
              <input
                type="number" min={0} step={0.01} placeholder="e.g. 5.0"
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Avg HR (bpm)</label>
              <input
                type="number" min={1} placeholder="e.g. 145"
                value={form.avg_hr}
                onChange={(e) => setForm({ ...form, avg_hr: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <input
              type="text" placeholder="Optional notes"
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
    </div>
  );
}
