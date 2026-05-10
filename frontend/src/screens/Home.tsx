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
  const REST_ACTIVITY_TYPES = new Set(['rest', 'mobility', 'cycling']);
  const isTrainingDay = (today?.activities ?? []).some((a) => !REST_ACTIVITY_TYPES.has(a.type.toLowerCase()));
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
    <div className="animate-fade-in">
      <div className="pb-5 flex items-baseline justify-between animate-fade-up">
        <p className="text-sm text-ink-tertiary">{dateStr}</p>
        {!loadingToday && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-widest ${
              isTrainingDay ? 'text-brand-500' : 'text-ink-muted'
            }`}
          >
            {isTrainingDay ? 'Training' : 'Rest'}
          </span>
        )}
      </div>

      <div className="border-t border-white/[.06] py-5 animate-fade-up-1">
        <CoachingCard note={note} loading={loadingNote} />
      </div>

      <div className="border-t border-white/[.06] py-5 animate-fade-up-2">
        <SummaryBar data={today} loading={loadingToday} />
      </div>

      <div className="border-t border-white/[.06] pt-5 animate-fade-up-3">
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
