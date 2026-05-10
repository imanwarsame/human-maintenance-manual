import { useState } from 'react';
import type { MealPlan } from '../types/index.ts';
import { useMarkMealEaten } from '../hooks/useToday.ts';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snack',
};

interface Props {
  meal: MealPlan;
  readOnly?: boolean;
  onDelete?: (id: string) => void;
}

export default function MealPlanCard({ meal, readOnly = false, onDelete }: Props) {
  const [localEaten, setLocalEaten] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mutate: markEaten, isPending } = useMarkMealEaten();
  const isEaten = meal.completion !== null || localEaten;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isEaten
          ? 'bg-brand-500/[.05] border-brand-500/20'
          : 'bg-surface-1 border-white/[.07]'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            if (!isEaten && !readOnly) {
              setLocalEaten(true);
              markEaten(meal.id);
            }
          }}
          disabled={isPending || isEaten || readOnly}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            isEaten
              ? 'border-brand-500 bg-brand-500 scale-100'
              : readOnly
              ? 'border-white/[.12] cursor-default'
              : 'border-white/[.2] hover:border-brand-500 active:scale-90'
          }`}
        >
          {isEaten && (
            <span className="text-surface-0 text-[10px] leading-none font-bold animate-fade-in">✓</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`text-sm font-semibold transition-colors ${isEaten ? 'text-ink-tertiary line-through' : 'text-ink-primary'}`}>
              {meal.meal_name}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-ink-muted">{MEAL_LABELS[meal.meal_type]}</span>
              {onDelete && (
                confirmDelete ? (
                  <button
                    onClick={() => onDelete(meal.id)}
                    onBlur={() => setConfirmDelete(false)}
                    className="text-xs text-red-400 font-medium px-1.5 py-0.5 rounded border border-red-400/30 hover:bg-red-400/10 transition-colors animate-fade-in"
                    autoFocus
                  >
                    Confirm?
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-ink-muted hover:text-red-400 transition-colors text-sm leading-none active:scale-90"
                    aria-label="Delete meal"
                  >
                    ✕
                  </button>
                )
              )}
            </div>
          </div>
          {meal.description && (
            <p className="text-xs text-ink-tertiary mt-0.5">{meal.description}</p>
          )}
          <div className="flex gap-3 mt-1 text-xs text-ink-muted num">
            {meal.kcal != null && <span>{meal.kcal} kcal</span>}
            {meal.protein_g != null && <span>{meal.protein_g}g protein</span>}
            {meal.carbs_g != null && <span>{meal.carbs_g}g carbs</span>}
            {meal.fat_g != null && <span>{meal.fat_g}g fat</span>}
          </div>
          {meal.prep_notes && (
            <p className="text-xs text-ink-muted mt-1 italic">{meal.prep_notes}</p>
          )}
          {isEaten && meal.completion && (
            <p className="text-xs text-brand-500 mt-1 num animate-fade-in">
              Eaten at {new Date(meal.completion.eaten_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
