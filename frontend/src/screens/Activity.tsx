import { useState } from 'react';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { useDismissPlannedActivity } from '../hooks/useActivities.ts';
import ActivityCard from '../components/ActivityCard.tsx';
import WorkoutPlanCard from '../components/WorkoutPlanCard.tsx';
import RunPlanCard from '../components/RunPlanCard.tsx';
import type { Activity } from '../types/index.ts';

// Light pastel backgrounds per activity type — used for day cell colouring
const TYPE_BG: Record<string, string> = {
  run:      '#FED7AA', // orange-200
  cycling:  '#A5F3FC', // cyan-200
  strength: '#DDD6FE', // violet-200
  football: '#BBF7D0', // green-200
  swim:     '#BAE6FD', // sky-200
  walk:     '#D9F99D', // lime-200
  hike:     '#FDE68A', // amber-200
  mobility: '#FCE7F3', // pink-100
  other:    '#E5E7EB', // gray-200
};

function activityBg(activities: Activity[]): string | undefined {
  if (activities.length === 0) return undefined;
  const types = [...new Set(activities.map((a) => a.type))];
  const colors = types.slice(0, 3).map((t) => TYPE_BG[t] ?? TYPE_BG.other);
  if (colors.length === 1) return colors[0];
  if (colors.length === 2)
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  return `linear-gradient(135deg, ${colors[0]} 33%, ${colors[1]} 33% 66%, ${colors[2]} 66%)`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekContaining(dateStr: string): Date[] {
  const d = new Date(dateStr);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const TODAY = toDateStr(new Date());
const FIFTEEN_MIN = 15 * 60 * 1000;

function DayDetail({ date, activities }: { date: string; activities: Activity[] }) {
  const { mutate: dismissActivity } = useDismissPlannedActivity();
  const dayActivities = activities.filter((a) => a.date === date);
  if (dayActivities.length === 0) {
    const label =
      date > TODAY
        ? 'No workout planned for this day.'
        : date < TODAY
        ? 'No activity recorded.'
        : 'No activity yet today.';
    return <p className="text-sm text-gray-400 text-center py-6">{label}</p>;
  }
  return (
    <div className="space-y-3">
      {dayActivities.map((a) => {
        if (a.is_planned) {
          if (a.type === 'run' && a.raw_json?.run_plan) {
            return (
              <RunPlanCard key={a.id} plan={a.raw_json.run_plan} notes={a.notes} duration_mins={a.duration_mins} />
            );
          }
          return (
            <WorkoutPlanCard
              key={a.id}
              activityId={a.id}
              type={a.type}
              notes={a.notes}
              duration_mins={a.duration_mins}
              exercises={a.raw_json?.exercises ?? []}
              onComplete={() => dismissActivity(a.id)}
            />
          );
        }
        return (
          <ActivityCard
            key={a.id}
            activity={a}
            onDelete={() => dismissActivity(a.id)}
          />
        );
      })}
    </div>
  );
}

export default function Activity() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const selD = new Date(selectedDate);

  // Week range always derived from selectedDate
  const weekDays = weekContaining(selectedDate);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

  // Month range always derived from selectedDate
  const monthStart = toDateStr(new Date(selD.getFullYear(), selD.getMonth(), 1));
  const monthEnd = toDateStr(new Date(selD.getFullYear(), selD.getMonth() + 1, 0));
  const monthCells = monthGrid(selD.getFullYear(), selD.getMonth());

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  const { data: activities = [], isLoading } = useActivitiesForDateRange(
    rangeStart,
    rangeEnd,
    { refetchInterval: FIFTEEN_MIN }
  );

  function shiftWeek(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(toDateStr(d));
  }

  function shiftMonth(delta: number) {
    const d = new Date(selD.getFullYear(), selD.getMonth() + delta, 1);
    setSelectedDate(toDateStr(d));
  }

  const weekLabel = (() => {
    const s = weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const e = weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const monthLabel = selD.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const isOnToday =
    viewMode === 'week'
      ? weekDays.some((d) => toDateStr(d) === TODAY)
      : selD.getFullYear() === new Date().getFullYear() &&
        selD.getMonth() === new Date().getMonth();

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
          {!isOnToday && (
            <button
              onClick={() => setSelectedDate(TODAY)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button onClick={() => shiftWeek(-1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">‹</button>
            <span className="font-medium">{weekLabel}</span>
            <button onClick={() => shiftWeek(1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              const str = toDateStr(d);
              const dayActs = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : activityBg(dayActs);

              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={bg ? { background: bg } : undefined}
                  className={[
                    'flex flex-col items-center py-2 rounded-xl text-xs transition-all',
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md'
                      : bg
                      ? 'text-gray-700 hover:opacity-80'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-400 hover:bg-gray-100',
                  ].join(' ')}
                >
                  <span className="font-medium leading-none mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                  </span>
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-400' : ''}>
                    {d.getDate()}
                  </span>
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
            <button onClick={() => shiftMonth(-1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">‹</button>
            <span className="font-medium">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((h, i) => (
              <p key={i} className="text-center text-xs text-gray-400 pb-1 font-medium">{h}</p>
            ))}
            {monthCells.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toDateStr(d);
              const dayActs = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : activityBg(dayActs);

              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={bg ? { background: bg } : undefined}
                  className={[
                    'flex items-center justify-center rounded-lg text-xs h-8 transition-all',
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm'
                      : bg
                      ? 'text-gray-700 hover:opacity-80'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-400 hover:bg-gray-100',
                  ].join(' ')}
                >
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-400' : ''}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Day detail */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {new Date(selectedDate).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <DayDetail date={selectedDate} activities={activities} />
        </div>
      )}
    </div>
  );
}
