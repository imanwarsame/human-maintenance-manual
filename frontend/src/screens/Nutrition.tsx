import { useState } from 'react';
import { useMealsForDate, useMealsForDateRange, useDeleteMeal } from '../hooks/useMealsForDate.ts';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { usePlanContext } from '../hooks/usePlanContext.ts';
import MealPlanCard from '../components/MealPlanCard.tsx';
import type { MealPlan, MealType, MacroTargets } from '../types/index.ts';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekContaining(date: Date): Date[] {
  const d = new Date(date);
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayKcalEaten(meals: MealPlan[], date: string): number {
  return meals
    .filter((m) => m.date === date && m.completion !== null)
    .reduce((s, m) => s + (m.kcal ?? 0), 0);
}

function dayCalorieColor(
  meals: MealPlan[],
  date: string,
  target: number | null,
  isSelected: boolean
): string {
  if (!target || date > TODAY || isSelected) return '';
  const eaten = dayKcalEaten(meals, date);
  if (eaten === 0) return '';
  const pct = eaten / target;
  if (pct >= 0.8 && pct <= 1.1) return 'ring-2 ring-green-400';
  if (pct < 0.8) return 'ring-2 ring-amber-400';
  return 'ring-2 ring-red-400';
}

const TODAY = toDateStr(new Date());

function macroBarColor(achieved: number, target: number): string {
  const pct = target > 0 ? achieved / target : 0;
  if (pct > 1.1) return 'bg-red-400';
  if (pct >= 0.8) return 'bg-green-400';
  return 'bg-amber-400';
}

interface MacroSummaryProps {
  macroTargets: MacroTargets | null;
  calorieTarget: number | null;
  achieved: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  mealsEaten: number;
  mealsTotal: number;
  isTrainingDay: boolean;
}

function MacroSummary({ macroTargets, calorieTarget, achieved, mealsEaten, mealsTotal, isTrainingDay }: MacroSummaryProps) {
  const kcalTarget = macroTargets?.kcal ?? calorieTarget;

  const rows = [
    { label: 'Calories', value: Math.round(achieved.kcal), target: kcalTarget, unit: 'kcal', integer: true },
    { label: 'Protein', value: Math.round(achieved.protein_g), target: macroTargets?.protein_g ?? null, unit: 'g', integer: true },
    { label: 'Carbs', value: Math.round(achieved.carbs_g), target: macroTargets?.carbs_g ?? null, unit: 'g', integer: true },
    { label: 'Fat', value: Math.round(achieved.fat_g), target: macroTargets?.fat_g ?? null, unit: 'g', integer: true },
  ].filter((r) => r.target != null || r.value > 0);

  if (rows.length === 0 && mealsTotal === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
      {rows.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {rows.map(({ label, value, target, unit }) => (
            <div key={label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs">
                  <span className="font-semibold text-gray-800">{value.toLocaleString()}</span>
                  {target != null && (
                    <span className="text-gray-400"> / {target.toLocaleString()}{unit}</span>
                  )}
                  {target == null && <span className="text-gray-400">{unit}</span>}
                </span>
              </div>
              {target != null && (
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${macroBarColor(value, target)}`}
                    style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-0.5">No macro targets set</p>
      )}
      <div className="flex items-center justify-between pt-0.5">
        {isTrainingDay && <span className="text-xs text-brand-500">training day</span>}
        {mealsTotal > 0 && (
          <span className={`text-xs text-gray-400 ${isTrainingDay ? '' : 'ml-auto'}`}>
            {mealsEaten}/{mealsTotal} meals eaten
          </span>
        )}
      </div>
    </div>
  );
}

export default function Nutrition() {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const selDate = new Date(selectedDate);
  const weekDays = getWeekContaining(selDate);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);

  const monthDate = new Date(selDate.getFullYear(), selDate.getMonth(), 1);
  const monthStart = toDateStr(monthDate);
  const monthEnd = toDateStr(new Date(selDate.getFullYear(), selDate.getMonth() + 1, 0));
  const monthDays = getMonthDays(selDate.getFullYear(), selDate.getMonth());

  const rangeStart = viewMode === 'week' ? weekStart : monthStart;
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd;

  // Meals for the selected day (detail view)
  const { data: dayMeals, isLoading } = useMealsForDate(selectedDate);
  const { mutate: deleteMeal } = useDeleteMeal();
  // Meals for the full range (calorie colouring)
  const { data: rangeMeals = [] } = useMealsForDateRange(rangeStart, rangeEnd);
  // Activities for the selected day (determines training vs rest target)
  const { data: dayActivities = [] } = useActivitiesForDateRange(selectedDate, selectedDate);
  const { data: calorieCtx } = usePlanContext<{ training: number; rest: number }>('calorie_targets');
  const { data: macroCtx } = usePlanContext<MacroTargets>('macro_targets');

  const sorted = [...(dayMeals ?? [])].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );
  const completedMeals = (dayMeals ?? []).filter((m) => m.completion !== null);
  const eaten = completedMeals.length;
  const totalKcal = completedMeals.reduce((s, m) => s + (m.kcal ?? 0), 0);
  const totalProtein = completedMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const totalCarbs = completedMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
  const totalFat = completedMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0);

  const hasActivity = dayActivities.length > 0;
  const targets = calorieCtx?.value ?? null;
  const calorieTarget = targets
    ? hasActivity ? targets.training : targets.rest
    : null;
  const macroTargets = macroCtx?.value ?? null;

  const isToday = selectedDate === TODAY;
  const isFuture = selectedDate > TODAY;
  const isOnToday =
    viewMode === 'week'
      ? weekDays.some((d) => toDateStr(d) === TODAY)
      : selDate.getFullYear() === new Date().getFullYear() &&
        selDate.getMonth() === new Date().getMonth();

  function shiftDay(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(toDateStr(d));
  }

  function shiftMonth(delta: number) {
    const d = new Date(selDate.getFullYear(), selDate.getMonth() + delta, 1);
    setSelectedDate(toDateStr(d));
  }

  const weekLabel = (() => {
    const s = weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const e = weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  })();

  const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Nutrition</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                  viewMode === v ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {!isOnToday && (
            <button
              onClick={() => setSelectedDate(TODAY)}
              className="text-xs font-medium px-2 py-1 rounded-lg text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Week view — nav + strip */}
      {viewMode === 'week' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button onClick={() => shiftDay(-1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">‹</button>
            <span className="font-medium text-gray-700">{weekLabel}</span>
            <button onClick={() => shiftDay(1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const str = toDateStr(d);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const colorRing = dayCalorieColor(rangeMeals, str, calorieTarget, isSelected);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1.5 rounded-xl text-xs transition-colors ${colorRing} ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <button onClick={() => shiftMonth(-1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">‹</button>
            <span className="font-medium">{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} className="p-1 rounded hover:bg-gray-100 text-lg leading-none">›</button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <p key={i} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</p>
            ))}
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toDateStr(d);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const colorRing = dayCalorieColor(rangeMeals, str, calorieTarget, isSelected);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1 rounded-lg text-xs transition-colors ${colorRing} ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isT
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Daily macro summary */}
      <MacroSummary
        macroTargets={macroTargets}
        calorieTarget={calorieTarget}
        achieved={{ kcal: totalKcal, protein_g: totalProtein, carbs_g: totalCarbs, fat_g: totalFat }}
        mealsEaten={eaten}
        mealsTotal={(dayMeals ?? []).length}
        isTrainingDay={hasActivity}
      />

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
            <MealPlanCard key={meal.id} meal={meal} readOnly={!isToday} onDelete={deleteMeal} />
          ))}
        </div>
      )}
    </div>
  );
}
