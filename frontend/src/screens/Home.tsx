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

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Good day, Iman</h1>
      <CoachingCard note={note} loading={loadingNote} />
      <SummaryBar data={today} loading={loadingToday} />
      <MacroSummary
        macroTargets={macroCtx?.value ?? null}
        calorieTarget={calorieTarget}
        achieved={{
          kcal: completedMeals.reduce((s, m) => s + (m.kcal ?? 0), 0),
          protein_g: completedMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0),
          carbs_g: completedMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0),
          fat_g: completedMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0),
        }}
        mealsEaten={completedMeals.length}
        mealsTotal={today?.meals.length ?? 0}
        isTrainingDay={isTrainingDay}
      />
    </div>
  );
}
