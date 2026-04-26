import { useToday } from '../hooks/useToday.ts';
import MealPlanCard from '../components/MealPlanCard.tsx';
import type { MealType } from '../types/index.ts';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Nutrition() {
  const { data: today, isLoading } = useToday();

  const meals = today?.meals ?? [];
  const sorted = [...meals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  const eaten = meals.filter((m) => m.completion !== null).length;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nutrition</h1>
        {meals.length > 0 && (
          <span className="text-sm text-gray-500">{eaten}/{meals.length} meals eaten</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400 space-y-1">
          <p>No meal plan for today yet.</p>
          <p>Claude will write one — or ask Claude to plan your meals via the MCP server.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meal) => (
            <MealPlanCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
