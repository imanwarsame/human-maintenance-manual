import { useState } from 'react';
import { useMealsForDate } from '../hooks/useMealsForDate.ts';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { usePlanContext } from '../hooks/usePlanContext.ts';
import MealPlanCard from '../components/MealPlanCard.tsx';
import type { MealType } from '../types/index.ts';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

const TODAY = toDateStr(new Date());

export default function Nutrition() {
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const weekDays = getWeekDays(new Date(selectedDate));

  const { data: meals, isLoading } = useMealsForDate(selectedDate);
  const { data: activitiesData } = useActivitiesForDateRange(selectedDate, selectedDate);
  const { data: calorieCtx } = usePlanContext<{ training: number; rest: number }>('calorie_targets');

  const sorted = [...(meals ?? [])].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );
  const eaten = (meals ?? []).filter((m) => m.completion !== null).length;

  const hasActivity = (activitiesData ?? []).length > 0;
  const calorieTarget = calorieCtx?.value
    ? hasActivity
      ? calorieCtx.value.training
      : calorieCtx.value.rest
    : null;

  const isToday = selectedDate === TODAY;
  const isFuture = selectedDate > TODAY;

  function shiftDay(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateStr(d));
  }

  const displayDate = new Date(selectedDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="space-y-4">
      {/* Header + day navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nutrition</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Previous day"
          >
            ‹
          </button>
          <button
            onClick={() => setSelectedDate(TODAY)}
            className={`text-sm px-2 py-0.5 rounded-lg transition-colors ${
              isToday ? 'font-semibold text-brand-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isToday ? 'Today' : displayDate}
          </button>
          <button
            onClick={() => shiftDay(1)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Next day"
          >
            ›
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => {
          const str = toDateStr(d);
          const isSelected = str === selectedDate;
          const isT = str === TODAY;
          return (
            <button
              key={str}
              onClick={() => setSelectedDate(str)}
              className={`flex flex-col items-center py-1.5 rounded-xl text-xs transition-colors ${
                isSelected
                  ? 'bg-brand-600 text-white'
                  : isT
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">
                {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </span>
              <span>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        {calorieTarget != null ? (
          <span>
            Target: <span className="font-semibold text-gray-700">{calorieTarget.toLocaleString()} kcal</span>
            {hasActivity && <span className="ml-1 text-xs text-brand-500">(training)</span>}
          </span>
        ) : (
          <span />
        )}
        {(meals ?? []).length > 0 && (
          <span>{eaten}/{(meals ?? []).length} meals eaten</span>
        )}
      </div>

      {/* Meal list */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400 space-y-1">
          <p>No meal plan {isFuture ? 'for this day yet' : 'for today yet'}.</p>
          <p>Ask Claude to plan your meals via the MCP server.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meal) => (
            <MealPlanCard key={meal.id} meal={meal} readOnly={!isToday} />
          ))}
        </div>
      )}
    </div>
  );
}
