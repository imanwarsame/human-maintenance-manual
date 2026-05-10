import { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (loading || targetLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-2 bg-white/[.05] rounded w-1/2" />
            <div className="h-3 bg-white/[.05] rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const hydrationMl = data?.hydration.total_ml ?? 0;
  const mealsEaten = data?.meals.filter((m) => m.completion !== null).length ?? 0;
  const mealsTotal = data?.meals.length ?? 0;
  const hasActivity = (data?.activities.length ?? 0) > 0;
  const hydrationL = (hydrationMl / 1000).toFixed(1);
  const targetL = (HYDRATION_TARGET_ML / 1000).toFixed(1);
  const hydrationPct = Math.min(100, (hydrationMl / HYDRATION_TARGET_ML) * 100);

  return (
    <div className="grid grid-cols-3 divide-x divide-white/[.06]">
      <div className="pr-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-ink-tertiary">Water</p>
        <p className="text-sm font-semibold text-ink-primary num">
          {hydrationL}{' '}
          <span className="text-xs font-normal text-ink-tertiary">/ {targetL} L</span>
        </p>
        <div className="w-full bg-white/[.06] rounded-full h-0.5">
          <div
            className="bg-blue-400 h-0.5 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: mounted ? `${hydrationPct}%` : '0%' }}
          />
        </div>
      </div>

      <div className="px-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-ink-tertiary">Meals</p>
        <p className="text-sm font-semibold text-ink-primary num">
          {mealsEaten}{' '}
          <span className="text-xs font-normal text-ink-tertiary">/ {mealsTotal}</span>
        </p>
      </div>

      <div className="pl-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-ink-tertiary">Activity</p>
        <p className={`text-sm font-semibold transition-colors ${hasActivity ? 'text-brand-500' : 'text-ink-muted'}`}>
          {hasActivity ? 'Done' : '–'}
        </p>
      </div>
    </div>
  );
}
