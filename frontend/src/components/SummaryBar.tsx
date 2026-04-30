import type { TodaySummary } from '../types/index.ts';
import { usePlanContext } from '../hooks/usePlanContext.ts';

const DEFAULT_TARGET_ML = 3000;

interface Props {
  data: TodaySummary | undefined;
  loading: boolean;
}

export default function SummaryBar({ data, loading }: Props) {
  const { data: targetCtx, isLoading: targetLoading } = usePlanContext<number>('hydration_target_ml');
  const HYDRATION_TARGET_ML = (targetCtx?.value as number | undefined) ?? DEFAULT_TARGET_ML;

  if (loading || targetLoading) {
    return <div className="grid grid-cols-3 gap-3 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="bg-white rounded-xl h-20 border border-gray-100" />)}</div>;
  }

  const hydrationMl = data?.hydration.total_ml ?? 0;
  const mealsEaten = data?.meals.filter((m) => m.completion !== null).length ?? 0;
  const mealsTotal = data?.meals.length ?? 0;
  const hasActivity = (data?.activities.length ?? 0) > 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center">
        <span className="text-2xl mb-1">💧</span>
        <span className="text-sm font-semibold text-gray-800">{hydrationMl.toLocaleString('en-GB')} ml</span>
        <span className="text-xs text-gray-400">of {HYDRATION_TARGET_ML.toLocaleString('en-GB')} ml</span>
        <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
          <div
            className="bg-blue-400 h-1 rounded-full transition-all"
            style={{ width: `${Math.min(100, (hydrationMl / HYDRATION_TARGET_ML) * 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center">
        <span className="text-2xl mb-1">🥗</span>
        <span className="text-sm font-semibold text-gray-800">{mealsEaten}/{mealsTotal}</span>
        <span className="text-xs text-gray-400">meals eaten</span>
      </div>

      <div className={`rounded-xl border p-4 flex flex-col items-center ${hasActivity ? 'bg-brand-50 border-brand-500/20' : 'bg-white border-gray-100'}`}>
        <span className="text-2xl mb-1">🏃</span>
        <span className="text-sm font-semibold text-gray-800">{hasActivity ? 'Done' : 'None yet'}</span>
        <span className="text-xs text-gray-400">activity</span>
      </div>
    </div>
  );
}
