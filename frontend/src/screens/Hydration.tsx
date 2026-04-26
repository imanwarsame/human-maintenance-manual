import { useToday } from '../hooks/useToday.ts';
import { useWeek } from '../hooks/useWeek.ts';
import HydrationLogger from '../components/HydrationLogger.tsx';

const TARGET_ML = 3000;

function HydrationBar({ date, total }: { date: string; total: number }) {
  const pct = Math.min(100, (total / TARGET_ML) * 100);
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

  const totalMl = today?.hydration.total_ml ?? 0;
  const pct = Math.min(100, (totalMl / TARGET_ML) * 100);

  // Build day-by-day totals from week data
  const dayTotals: Record<string, number> = {};
  for (const log of week?.hydrationLogs ?? []) {
    dayTotals[log.date] = (dayTotals[log.date] ?? 0) + log.amount_ml;
  }

  const days = Object.entries(dayTotals).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Hydration</h1>

      {/* Today's ring */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-sm text-gray-500 mb-2">Today's total</p>
        {isLoading ? (
          <div className="h-16 animate-pulse bg-gray-100 rounded-xl" />
        ) : (
          <>
            <p className="text-4xl font-bold text-blue-500">{totalMl.toLocaleString('en-GB')}</p>
            <p className="text-sm text-gray-400">ml of {TARGET_ML.toLocaleString('en-GB')} ml target</p>
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

      {/* Weekly chart */}
      {days.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Last 7 days</p>
          <div className="grid grid-cols-7 gap-1">
            {days.map(([date, total]) => (
              <HydrationBar key={date} date={date} total={total} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
