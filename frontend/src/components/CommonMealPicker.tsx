import { useState } from 'react';
import { usePlanContext } from '../hooks/usePlanContext.ts';
import { useAddMeal } from '../hooks/useMealsForDate.ts';
import type { MealType } from '../types/index.ts';

export interface CommonMeal {
  name: string;
  description?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  prep_notes?: string;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

interface Props {
  date: string;
}

export default function CommonMealPicker({ date }: Props) {
  const { data: ctx, isLoading } = usePlanContext<CommonMeal[]>('common_meals');
  const { mutate: addMeal, isPending } = useAddMeal();

  const meals = ctx?.value ?? [];

  const [selectedMealName, setSelectedMealName] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  if (isLoading || meals.length === 0) return null;

  const selectedMeal = meals.find((m) => m.name === selectedMealName);

  function handleAdd() {
    if (!selectedMeal) return;
    addMeal(
      {
        date,
        meal_type: selectedMealType,
        meal_name: selectedMeal.name,
        description: selectedMeal.description,
        kcal: selectedMeal.kcal,
        protein_g: selectedMeal.protein_g,
        carbs_g: selectedMeal.carbs_g,
        fat_g: selectedMeal.fat_g,
        prep_notes: selectedMeal.prep_notes,
      },
      {
        onSuccess: () => {
          setSelectedMealName('');
        },
      }
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add common meal</p>
      <div className="flex gap-2">
        <select
          value={selectedMealName}
          onChange={(e) => setSelectedMealName(e.target.value)}
          className="flex-1 text-sm rounded-lg border border-gray-200 px-2.5 py-1.5 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-0"
        >
          <option value="">Select meal…</option>
          {meals.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}{m.kcal != null ? ` (${m.kcal} kcal)` : ''}
            </option>
          ))}
        </select>

        <select
          value={selectedMealType}
          onChange={(e) => setSelectedMealType(e.target.value as MealType)}
          className="text-sm rounded-lg border border-gray-200 px-2.5 py-1.5 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {MEAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          disabled={!selectedMeal || isPending}
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700 transition-colors shrink-0"
        >
          Add
        </button>
      </div>

      {selectedMeal && (selectedMeal.description || selectedMeal.kcal != null) && (
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 px-0.5">
          {selectedMeal.description && <span>{selectedMeal.description}</span>}
          {selectedMeal.kcal != null && <span>{selectedMeal.kcal} kcal</span>}
          {selectedMeal.protein_g != null && <span>{selectedMeal.protein_g}g protein</span>}
          {selectedMeal.carbs_g != null && <span>{selectedMeal.carbs_g}g carbs</span>}
          {selectedMeal.fat_g != null && <span>{selectedMeal.fat_g}g fat</span>}
        </div>
      )}
    </div>
  );
}
