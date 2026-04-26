import { useState } from 'react';
import type { MealPlan } from '../types/index.ts';
import { useMarkMealEaten } from '../hooks/useToday.ts';
import DeviationModal from './DeviationModal.tsx';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface Props {
  meal: MealPlan;
  readOnly?: boolean;
}

export default function MealPlanCard({ meal, readOnly = false }: Props) {
  const [showDeviation, setShowDeviation] = useState(false);
  const { mutate: markEaten, isPending } = useMarkMealEaten();
  const isEaten = meal.completion !== null;

  return (
    <>
      <div
        className={`bg-white rounded-xl border p-4 transition-all ${
          isEaten ? 'border-brand-500/30 bg-brand-50/40' : 'border-gray-100'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => !isEaten && !readOnly && markEaten(meal.id)}
            disabled={isPending || isEaten || readOnly}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              isEaten
                ? 'border-brand-500 bg-brand-500'
                : readOnly
                ? 'border-gray-200 cursor-default'
                : 'border-gray-300 hover:border-brand-500'
            }`}
          >
            {isEaten && <span className="text-white text-xs">✓</span>}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm font-semibold ${isEaten ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                {meal.meal_name}
              </p>
              <span className="text-xs text-gray-400 shrink-0">{MEAL_LABELS[meal.meal_type]}</span>
            </div>
            {meal.description && (
              <p className="text-xs text-gray-500 mt-0.5">{meal.description}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-gray-400">
              {meal.kcal != null && <span>{meal.kcal} kcal</span>}
              {meal.protein_g != null && <span>{meal.protein_g}g protein</span>}
              {meal.carbs_g != null && <span>{meal.carbs_g}g carbs</span>}
              {meal.fat_g != null && <span>{meal.fat_g}g fat</span>}
            </div>
            {meal.prep_notes && (
              <p className="text-xs text-gray-400 mt-1 italic">{meal.prep_notes}</p>
            )}

            {isEaten && meal.completion && (
              <p className="text-xs text-brand-600 mt-1">
                Eaten at {new Date(meal.completion.eaten_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {meal.deviations.length > 0 && (
              <div className="mt-2 space-y-1">
                {meal.deviations.map((d) => (
                  <p key={d.id} className="text-xs bg-amber-50 text-amber-700 rounded-lg px-2 py-1">
                    ⚠ {d.description}
                    {d.kcal && ` · ${d.kcal} kcal`}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowDeviation(true)}
              className="mt-2 text-xs text-gray-400 hover:text-amber-600 transition-colors"
            >
              + Log deviation
            </button>
          </div>
        </div>
      </div>

      {showDeviation && (
        <DeviationModal mealId={meal.id} onClose={() => setShowDeviation(false)} />
      )}
    </>
  );
}
