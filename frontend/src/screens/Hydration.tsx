import { useState } from 'react';
import { usePlanContext, useUpdatePlanContext } from '../hooks/usePlanContext.ts';
import { useHydrationForDate, useHydrationForDateRange } from '../hooks/useHydration.ts';
import HydrationLogger from '../components/HydrationLogger.tsx';

const DEFAULT_TARGET = 3000;

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

function hydrationBg(total: number, target: number): string | undefined {
  if (total <= 0) return undefined;
  const pct = total / target;
  if (pct >= 1)   return 'rgba(96,165,250,0.22)';
  if (pct >= 0.8) return 'rgba(96,165,250,0.14)';
  if (pct >= 0.5) return 'rgba(96,165,250,0.09)';
  return 'rgba(96,165,250,0.05)';
}

function hydrationTextClass(total: number, target: number, isSelected: boolean, isT: boolean): string {
  if (isSelected) return 'text-surface-0';
  const pct = total / target;
  if (total > 0 && pct >= 1) return 'text-blue-300';
  if (total > 0) return 'text-blue-400/70';
  if (isT) return 'text-brand-500 font-semibold';
  return 'text-ink-tertiary';
}

const TODAY = toDateStr(new Date());

export default function Hydration() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const { data: targetCtx } = usePlanContext<number>('hydration_target_ml');
  const { mutate: updateTarget, isPending: isSaving } = useUpdatePlanContext();

  const targetMl = targetCtx?.value ?? DEFAULT_TARGET;
  const selD = new Date(selectedDate);
  const isToday = selectedDate === TODAY;

  const weekDays = weekContaining(selectedDate);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);
  const monthStart = toDateStr(new Date(selD.getFullYear(), selD.getMonth(), 1));
  const monthEnd = toDateStr(new Date(selD.getFullYear(), selD.getMonth() + 1, 0));
  const monthCells = monthGrid(selD.getFullYear(), selD.getMonth());

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  const { data: rangeLogs = [] } = useHydrationForDateRange(rangeStart, rangeEnd);
  const { data: dayData, isLoading: dayLoading } = useHydrationForDate(selectedDate);

  const dayTotals: Record<string, number> = {};
  for (const log of rangeLogs) {
    dayTotals[log.date] = (dayTotals[log.date] ?? 0) + log.amount_ml;
  }

  const totalMl = dayData?.total_ml ?? 0;
  const pct = Math.min(100, (totalMl / targetMl) * 100);

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

  const isOnToday =
    viewMode === 'week'
      ? weekDays.some((d) => toDateStr(d) === TODAY)
      : selD.getFullYear() === new Date().getFullYear() &&
        selD.getMonth() === new Date().getMonth();

  function startEdit() {
    setTargetInput(String(targetMl));
    setEditingTarget(true);
  }

  function saveTarget() {
    const val = parseInt(targetInput, 10);
    if (!val || val < 100) return;
    updateTarget({ key: 'hydration_target_ml', value: val }, { onSuccess: () => setEditingTarget(false) });
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <h1 className="text-base font-semibold text-ink-primary tracking-wide">Hydration</h1>
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
            disabled={isOnToday && isToday}
            className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
              isOnToday && isToday
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
              const total = dayTotals[str] ?? 0;
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : hydrationBg(total, targetMl);
              const textCls = hydrationTextClass(total, targetMl, isSelected, isT);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={bg ? { background: bg } : undefined}
                  className={[
                    'flex flex-col items-center py-2 rounded-xl text-xs transition-all duration-150 active:scale-[.94]',
                    isSelected
                      ? 'bg-brand-500 shadow-sm'
                      : bg
                      ? 'hover:brightness-125'
                      : isT
                      ? 'bg-brand-500/[.08]'
                      : 'hover:bg-surface-2',
                    textCls,
                  ].join(' ')}
                >
                  <span className="font-medium leading-none mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                  </span>
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-500/50' : ''}>
                    {d.getDate()}
                  </span>
                  {total > 0 && !isSelected && (
                    <span className="text-[9px] mt-0.5 opacity-70 leading-none num">
                      {(total / 1000).toFixed(1)}L
                    </span>
                  )}
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
              const total = dayTotals[str] ?? 0;
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const bg = isSelected ? undefined : hydrationBg(total, targetMl);
              const textCls = hydrationTextClass(total, targetMl, isSelected, isT);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  style={bg ? { background: bg } : undefined}
                  className={[
                    'flex items-center justify-center rounded-lg text-xs h-8 transition-all duration-150 active:scale-[.9]',
                    isSelected
                      ? 'bg-brand-500'
                      : bg
                      ? 'hover:brightness-125'
                      : isT
                      ? 'bg-brand-500/[.08]'
                      : 'hover:bg-surface-2',
                    textCls,
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

      {/* Selected day detail */}
      <div className="bg-surface-1 rounded-2xl border border-white/[.07] p-5 animate-fade-up-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-ink-secondary tracking-wide">
            {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {!editingTarget && (
            <button
              onClick={startEdit}
              className="text-ink-tertiary hover:text-brand-500 transition-colors text-xs"
              title="Edit target"
            >
              ✎ <span className="num">{targetMl.toLocaleString()}</span> ml target
            </button>
          )}
        </div>

        {editingTarget && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-ink-secondary">Target:</span>
            <input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              min={100}
              step={100}
              className="w-24 bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1 text-sm text-center text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              autoFocus
            />
            <span className="text-sm text-ink-secondary">ml</span>
            <button
              onClick={saveTarget}
              disabled={isSaving}
              className="text-xs font-semibold text-surface-0 bg-brand-500 hover:bg-brand-600 px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors active:scale-[.97]"
            >
              {isSaving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingTarget(false)} className="text-xs text-ink-tertiary hover:text-ink-secondary">
              Cancel
            </button>
          </div>
        )}

        {dayLoading ? (
          <div className="h-12 animate-pulse bg-white/[.05] rounded-xl" />
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-blue-400 num">{totalMl.toLocaleString('en-GB')}</p>
              <p className="text-xs text-ink-tertiary mt-1">
                ml of <span className="num">{targetMl.toLocaleString('en-GB')}</span> ml
              </p>
            </div>
            <div className="w-full bg-white/[.06] rounded-full h-1.5">
              <div
                className="bg-blue-400 h-1.5 rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct >= 100 && (
              <p className="text-center text-xs text-blue-400 font-medium mt-2 animate-fade-in">Goal reached</p>
            )}
          </>
        )}
      </div>

      {/* Logger */}
      {isToday && <HydrationLogger />}
    </div>
  );
}
