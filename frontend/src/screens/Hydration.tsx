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

// Returns a blue background shade based on % of target achieved
function hydrationBg(total: number, target: number): string | undefined {
  if (total <= 0) return undefined;
  const pct = total / target;
  if (pct >= 1)    return '#60A5FA'; // blue-400  — goal met
  if (pct >= 0.8)  return '#93C5FD'; // blue-300  — nearly there
  if (pct >= 0.5)  return '#BFDBFE'; // blue-200  — halfway
  return '#DBEAFE';                   // blue-100  — some progress
}

function hydrationTextClass(total: number, target: number, isSelected: boolean, isT: boolean): string {
  if (isSelected) return 'text-white';
  const pct = total / target;
  if (total > 0 && pct >= 1) return 'text-white';
  if (total > 0) return 'text-blue-900';
  if (isT) return 'text-brand-600 font-semibold';
  return 'text-gray-400';
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

  // Calendar ranges
  const weekDays = weekContaining(selectedDate);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);
  const monthStart = toDateStr(new Date(selD.getFullYear(), selD.getMonth(), 1));
  const monthEnd = toDateStr(new Date(selD.getFullYear(), selD.getMonth() + 1, 0));
  const monthCells = monthGrid(selD.getFullYear(), selD.getMonth());

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  // Logs for the visible range (colouring the calendar)
  const { data: rangeLogs = [] } = useHydrationForDateRange(rangeStart, rangeEnd);
  // Selected day detail
  const { data: dayData, isLoading: dayLoading } = useHydrationForDate(selectedDate);

  // Aggregate logs into per-day totals
  const dayTotals: Record<string, number> = {};
  for (const log of rangeLogs) {
    dayTotals[log.date] = (dayTotals[log.date] ?? 0) + log.amount_ml;
  }

  const totalMl = dayData?.total_ml ?? 0;
  const pct = Math.min(100, (totalMl / targetMl) * 100);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Hydration</h1>
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
            onClick={() => setSelectedDate(TODAY)}
            disabled={isOnToday && isToday}
            className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
              isOnToday && isToday
                ? 'text-gray-300 cursor-default'
                : 'text-brand-600 hover:text-brand-700 hover:bg-brand-50'
            }`}
          >
            Today
          </button>
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
                    'flex flex-col items-center py-2 rounded-xl text-xs transition-all',
                    isSelected ? 'bg-brand-600 shadow-md' : bg ? 'hover:opacity-80' : isT ? 'bg-brand-50' : 'hover:bg-gray-100',
                    textCls,
                  ].join(' ')}
                >
                  <span className="font-medium leading-none mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                  </span>
                  <span className={isT && !isSelected ? 'underline underline-offset-2 decoration-brand-400' : ''}>
                    {d.getDate()}
                  </span>
                  {total > 0 && !isSelected && (
                    <span className="text-[9px] mt-0.5 opacity-80 leading-none">
                      {(total / 1000).toFixed(1)}L
                    </span>
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
                    'flex items-center justify-center rounded-lg text-xs h-8 transition-all',
                    isSelected ? 'bg-brand-600 shadow-sm' : bg ? 'hover:opacity-80' : isT ? 'bg-brand-50' : 'hover:bg-gray-100',
                    textCls,
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

      {/* Selected day detail */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">
            {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {!editingTarget && (
            <button onClick={startEdit} className="text-gray-400 hover:text-brand-600 transition-colors text-xs" title="Edit target">
              ✎ {targetMl.toLocaleString()} ml target
            </button>
          )}
        </div>

        {editingTarget && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-500">Target:</span>
            <input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              min={100}
              step={100}
              className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-300"
              autoFocus
            />
            <span className="text-sm text-gray-500">ml</span>
            <button
              onClick={saveTarget}
              disabled={isSaving}
              className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
            >
              {isSaving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingTarget(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        )}

        {dayLoading ? (
          <div className="h-12 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <>
            <div className="text-center mb-3">
              <p className="text-4xl font-bold text-blue-500">{totalMl.toLocaleString('en-GB')}</p>
              <p className="text-sm text-gray-400 mt-0.5">ml of {targetMl.toLocaleString('en-GB')} ml</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct >= 100 && (
              <p className="text-center text-xs text-blue-500 font-medium mt-2">Goal reached! 💧</p>
            )}
          </>
        )}
      </div>

      {/* Logger — only for today */}
      {isToday && <HydrationLogger />}
    </div>
  );
}
