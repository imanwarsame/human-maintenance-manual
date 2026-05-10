import { useState } from 'react';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { useDismissPlannedActivity } from '../hooks/useActivities.ts';
import ActivityCard from '../components/ActivityCard.tsx';
import WorkoutPlanCard from '../components/WorkoutPlanCard.tsx';
import RunPlanCard from '../components/RunPlanCard.tsx';
import type { Activity } from '../types/index.ts';

const TYPE_BG: Record<string, string> = {
  run:      'rgba(251,146,60,0.14)',
  cycling:  'rgba(34,211,238,0.11)',
  strength: 'rgba(167,139,250,0.14)',
  football: 'rgba(74,222,128,0.11)',
  swim:     'rgba(56,189,248,0.12)',
  walk:     'rgba(163,230,53,0.10)',
  hike:     'rgba(251,191,36,0.12)',
  mobility: 'rgba(249,168,212,0.10)',
  other:    'rgba(156,163,175,0.08)',
};

const TYPE_TEXT: Record<string, string> = {
  run:      'rgb(251,146,60)',
  cycling:  'rgb(34,211,238)',
  strength: 'rgb(167,139,250)',
  football: 'rgb(74,222,128)',
  swim:     'rgb(56,189,248)',
  walk:     'rgb(163,230,53)',
  hike:     'rgb(251,191,36)',
  mobility: 'rgb(249,168,212)',
  other:    'rgb(156,163,175)',
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

function activityTextColor(activities: Activity[]): string | undefined {
  if (activities.length === 0) return undefined;
  const t = activities[0].type;
  return TYPE_TEXT[t] ?? TYPE_TEXT.other;
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
    return <p className="text-sm text-ink-tertiary text-center py-6">{label}</p>;
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

  const weekDays = weekContaining(selectedDate);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

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
    d.setDate(d.getDate() + delta);
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <h1 className="text-base font-semibold text-ink-primary tracking-wide">Activity</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg p-0.5 text-xs border border-white/[.06]">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-2.5 py-1 rounded-md transition-all duration-150 capitalize ${
                  viewMode === v
                    ? 'bg-surface-3 text-ink-primary shadow-sm font-medium'
                    : 'text-ink-tertiary hover:text-ink-secondary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedDate(TODAY)}
            disabled={selectedDate === TODAY}
            className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
              selectedDate === TODAY
                ? 'text-ink-muted cursor-default'
                : 'text-brand-500 hover:text-brand-400 hover:bg-brand-500/[.08] active:scale-[.97]'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <div className="animate-fade-up-1 space-y-3">
          <div className="flex items-center justify-between text-sm text-ink-secondary">
            <button
              onClick={() => shiftWeek(-1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ‹
            </button>
            <span className="font-medium text-xs tracking-wide">{weekLabel}</span>
            <button
              onClick={() => shiftWeek(1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              const str = toDateStr(d);
              const dayActs = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : activityBg(dayActs);
              const textColor = !isSelected && dayActs.length > 0 ? activityTextColor(dayActs) : undefined;

              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={{
                    background: bg ?? undefined,
                    color: textColor,
                  }}
                  className={[
                    'flex flex-col items-center py-2 rounded-xl text-xs transition-all duration-150 active:scale-[.94]',
                    isSelected
                      ? 'bg-brand-500 text-surface-0 shadow-sm'
                      : bg
                      ? 'hover:brightness-125'
                      : isT
                      ? 'bg-brand-500/[.08] text-brand-500 font-semibold'
                      : 'text-ink-tertiary hover:bg-surface-2',
                  ].join(' ')}
                >
                  <span className="font-medium leading-none mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                  </span>
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-500/50' : ''}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <div className="animate-fade-up-1 space-y-3">
          <div className="flex items-center justify-between text-sm text-ink-secondary">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ‹
            </button>
            <span className="font-medium text-xs tracking-wide">{monthLabel}</span>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((h, i) => (
              <p key={i} className="text-center text-[10px] text-ink-muted pb-1 font-medium">{h}</p>
            ))}
            {monthCells.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toDateStr(d);
              const dayActs = activities.filter((a) => a.date === str);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : activityBg(dayActs);
              const textColor = !isSelected && dayActs.length > 0 ? activityTextColor(dayActs) : undefined;

              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={{ background: bg ?? undefined, color: textColor }}
                  className={[
                    'flex items-center justify-center rounded-lg text-xs h-8 transition-all duration-150 active:scale-[.9]',
                    isSelected
                      ? 'bg-brand-500 text-surface-0 shadow-sm'
                      : bg
                      ? 'hover:brightness-125'
                      : isT
                      ? 'bg-brand-500/[.08] text-brand-500 font-semibold'
                      : 'text-ink-tertiary hover:bg-surface-2',
                  ].join(' ')}
                >
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-500/50' : ''}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail */}
      {isLoading ? (
        <div className="space-y-3 animate-fade-up-2">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white/[.05] rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-surface-1 rounded-2xl border border-white/[.07] p-4 space-y-3 animate-fade-up-2">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest">
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
