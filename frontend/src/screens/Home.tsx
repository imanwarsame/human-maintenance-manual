import { useToday, useCoachingNote } from '../hooks/useToday.ts';
import { usePlanContext } from '../hooks/usePlanContext.ts';
import CoachingCard from '../components/CoachingCard.tsx';
import SummaryBar from '../components/SummaryBar.tsx';
import MacroSummary from '../components/MacroSummary.tsx';
import type { MacroTargets } from '../types/index.ts';

export default function Home() {
  const { data: today, isLoading: loadingToday } = useToday();
  const { data: note, isLoading: loadingNote } = useCoachingNote();
  const { data: macroCtx } = usePlanContext<MacroTargets>('macro_targets');
  const { data: calorieCtx } = usePlanContext<{ training: number; rest: number }>('calorie_targets');

  const completedMeals = (today?.meals ?? []).filter((m) => m.completion !== null);
  const isTrainingDay = (today?.activities ?? []).some((a) => a.type !== 'cycling');
  const macroTargets = macroCtx?.value ?? null;
  const calorieTarget = macroTargets
    ? (isTrainingDay ? (macroTargets.training?.kcal ?? null) : (macroTargets.rest?.kcal ?? null))
    : calorieCtx?.value
    ? (isTrainingDay ? calorieCtx.value.training : calorieCtx.value.rest)
    : null;

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      <div className="pb-5 flex items-baseline justify-between">
        <p className="text-sm text-gray-500">{dateStr}</p>
        {!loadingToday && (
          <span className={`text-xs font-medium ${isTrainingDay ? 'text-brand-600' : 'text-gray-400'}`}>
            {isTrainingDay ? 'Training' : 'Rest'}
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 py-5">
        <CoachingCard note={note} loading={loadingNote} />
      </div>

      <div className="border-t border-gray-100 py-5">
        <SummaryBar data={today} loading={loadingToday} />
      </div>

      <div className="border-t border-gray-100 pt-5">
        <MacroSummary
          macroTargets={macroCtx?.value ?? null}
          calorieTarget={calorieTarget}
          achieved={{
            kcal: completedMeals.reduce((s, m) => s + (m.kcal ?? 0), 0),
            protein_g: completedMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0),
            carbs_g: completedMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0),
            fat_g: completedMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0),
          }}
          isTrainingDay={isTrainingDay}
        />
      </div>
    </div>
  );
}
