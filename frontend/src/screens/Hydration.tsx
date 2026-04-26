import { useState } from 'react';
import { useToday } from '../hooks/useToday.ts';
import { useWeek } from '../hooks/useWeek.ts';
import { usePlanContext, useUpdatePlanContext } from '../hooks/usePlanContext.ts';
import HydrationLogger from '../components/HydrationLogger.tsx';

const DEFAULT_TARGET = 3000;

function HydrationBar({ date, total, target }: { date: string; total: number; target: number }) {
  const pct = Math.min(100, (total / target) * 100);
  const label = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  return (
    <div className="flex items-end gap-1.5">
      <div className="flex-1">
        <div className="bg-gray-100 rounded-t-md overflow-hidden h-16 flex items-end">
          <div
            className="w-full bg-blue-400 rounded-t-md transition-all"
            style={{ height: `${Math.max(4, pct)}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-400 mt-1">{label}</p>
        <p className="text-center text-xs font-medium text-gray-600">{(total / 1000).toFixed(1)}L</p>
      </div>
    </div>
  );
}

export default function Hydration() {
  const { data: today, isLoading } = useToday();
  const { data: week } = useWeek();
  const { data: targetCtx } = usePlanContext<number>('hydration_target_ml');
  const { mutate: updateTarget, isPending: isSaving } = useUpdatePlanContext();

  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const targetMl = targetCtx?.value ?? DEFAULT_TARGET;
  const totalMl = today?.hydration.total_ml ?? 0;
  const pct = Math.min(100, (totalMl / targetMl) * 100);

  const dayTotals: Record<string, number> = {};
  for (const log of week?.hydrationLogs ?? []) {
    dayTotals[log.date] = (dayTotals[log.date] ?? 0) + log.amount_ml;
  }
  const days = Object.entries(dayTotals).sort(([a], [b]) => a.localeCompare(b));

  function startEdit() {
    setTargetInput(String(targetMl));
    setEditingTarget(true);
  }

  function saveTarget() {
    const val = parseInt(targetInput, 10);
    if (!val || val < 100) return;
    updateTarget(
      { key: 'hydration_target_ml', value: val },
      { onSuccess: () => setEditingTarget(false) }
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Hydration</h1>

      {/* Today's ring */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-sm text-gray-500">Today's total</p>
          {!editingTarget && (
            <button
              onClick={startEdit}
              className="text-gray-400 hover:text-brand-600 transition-colors text-xs"
              title="Edit target"
            >
              ✎
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="h-16 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <>
            <p className="text-4xl font-bold text-blue-500">{totalMl.toLocaleString('en-GB')}</p>

            {editingTarget ? (
              <div className="flex items-center justify-center gap-2 mt-2">
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
                <button
                  onClick={() => setEditingTarget(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                ml of {targetMl.toLocaleString('en-GB')} ml target
              </p>
            )}

            <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      <HydrationLogger />

      {days.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Last 7 days</p>
          <div className="grid grid-cols-7 gap-1">
            {days.map(([date, total]) => (
              <HydrationBar key={date} date={date} total={total} target={targetMl} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
