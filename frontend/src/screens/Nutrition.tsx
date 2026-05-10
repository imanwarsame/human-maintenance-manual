import { useState } from 'react';
import { useMealsForDate, useMealsForDateRange, useDeleteMeal } from '../hooks/useMealsForDate.ts';
import { useActivitiesForDateRange } from '../hooks/useActivitiesForDateRange.ts';
import { usePlanContext } from '../hooks/usePlanContext.ts';
import MealPlanCard from '../components/MealPlanCard.tsx';
import MacroSummary from '../components/MacroSummary.tsx';
import CommonMealPicker from '../components/CommonMealPicker.tsx';
import type { MealPlan, MealType, MacroTargets, Activity } from '../types/index.ts';

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

const REST_ACTIVITY_TYPES = new Set(['rest', 'mobility', 'cycling']);

function dayCalorieRing(
  meals: MealPlan[],
  date: string,
  rangeActivities: Activity[],
  macroTargets: MacroTargets | null,
  calorieCtx: { value: { training: number; rest: number } } | undefined,
  isSelected: boolean
): string {
  if (date > TODAY || isSelected) return '';
  const eaten = dayKcalEaten(meals, date);
  if (eaten === 0) return '';
  const dayActs = rangeActivities.filter((a) => a.date === date);
  const isTrain = dayActs.some((a) => !REST_ACTIVITY_TYPES.has(a.type.toLowerCase()));
  const target = macroTargets
    ? (isTrain ? (macroTargets.training?.kcal ?? null) : (macroTargets.rest?.kcal ?? null))
    : calorieCtx?.value
    ? (isTrain ? calorieCtx.value.training : calorieCtx.value.rest)
    : null;
  if (!target) return '';
  const pct = eaten / target;
  if (pct >= 0.8 && pct <= 1.1) return 'ring-1 ring-green-500/60';
  if (pct < 0.8) return 'ring-1 ring-amber-500/60';
  return 'ring-1 ring-red-500/60';
}

const TODAY = toDateStr(new Date());

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

  const { data: dayMeals, isLoading } = useMealsForDate(selectedDate);
  const { mutate: deleteMeal } = useDeleteMeal();
  const { data: rangeMeals = [] } = useMealsForDateRange(rangeStart, rangeEnd);
  const { data: rangeActivities = [] } = useActivitiesForDateRange(rangeStart, rangeEnd);
  const dayActivities = rangeActivities.filter((a) => a.date === selectedDate);
  const { data: calorieCtx } = usePlanContext<{ training: number; rest: number }>('calorie_targets');
  const { data: macroCtx } = usePlanContext<MacroTargets>('macro_targets');

  const sorted = [...(dayMeals ?? [])].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );
  const completedMeals = (dayMeals ?? []).filter((m) => m.completion !== null);
  const totalKcal = completedMeals.reduce((s, m) => s + (m.kcal ?? 0), 0);
  const totalProtein = completedMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const totalCarbs = completedMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0);
  const totalFat = completedMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0);

  const isTrainingDay = dayActivities.some((a) => !REST_ACTIVITY_TYPES.has(a.type.toLowerCase()));
  const macroTargets = macroCtx?.value ?? null;
  const calorieTarget = macroTargets
    ? (isTrainingDay ? (macroTargets.training?.kcal ?? null) : (macroTargets.rest?.kcal ?? null))
    : calorieCtx?.value
    ? (isTrainingDay ? calorieCtx.value.training : calorieCtx.value.rest)
    : null;

  const isToday = selectedDate === TODAY;
  const isFuture = selectedDate > TODAY;

  function shiftDay(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <h1 className="text-base font-semibold text-ink-primary tracking-wide">Nutrition</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg p-0.5 text-xs border border-white/[.06]">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-2.5 py-1 rounded-md transition-all duration-150 capitalize ${
                  viewMode === v
                    ? 'bg-surface-3 text-ink-primary shadow-sm font-medium'
                    : 'text-ink-tertiary hover:text-ink-secondary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedDate(TODAY)}
            disabled={isToday}
            className={`text-xs font-medium px-2 py-1 rounded-lg transition-all ${
              isToday
                ? 'text-ink-muted cursor-default'
                : 'text-brand-500 hover:text-brand-400 hover:bg-brand-500/[.08] active:scale-[.97]'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <div className="animate-fade-up-1 space-y-3">
          <div className="flex items-center justify-between text-sm text-ink-secondary">
            <button
              onClick={() => shiftDay(-1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ‹
            </button>
            <span className="font-medium text-xs tracking-wide">{weekLabel}</span>
            <button
              onClick={() => shiftDay(1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const str = toDateStr(d);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const colorRing = dayCalorieRing(rangeMeals, str, rangeActivities, macroTargets, calorieCtx, isSelected);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1.5 rounded-xl text-xs transition-all duration-150 active:scale-[.94] ${colorRing} ${
                    isSelected
                      ? 'bg-brand-500 text-surface-0'
                      : isT
                      ? 'bg-brand-500/[.08] text-brand-500 font-semibold'
                      : 'text-ink-tertiary hover:bg-surface-2'
                  }`}
                >
                  <span className="font-medium">{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <div className="animate-fade-up-1 space-y-3">
          <div className="flex items-center justify-between text-sm text-ink-secondary">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ‹
            </button>
            <span className="font-medium text-xs tracking-wide">{monthLabel}</span>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-lg leading-none transition-colors active:scale-[.9]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <p key={i} className="text-center text-[10px] text-ink-muted py-1 font-medium">{d}</p>
            ))}
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const str = toDateStr(d);
              const isSelected = str === selectedDate;
              const isT = str === TODAY;
              const colorRing = dayCalorieRing(rangeMeals, str, rangeActivities, macroTargets, calorieCtx, isSelected);
              return (
                <button
                  key={str}
                  onClick={() => setSelectedDate(str)}
                  className={`flex flex-col items-center py-1 rounded-lg text-xs transition-all duration-150 active:scale-[.9] ${colorRing} ${
                    isSelected
                      ? 'bg-brand-500 text-surface-0'
                      : isT
                      ? 'bg-brand-500/[.08] text-brand-500 font-semibold'
                      : 'text-ink-tertiary hover:bg-surface-2'
                  }`}
                >
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily macro summary */}
      <div className="animate-fade-up-2">
        <MacroSummary
          macroTargets={macroTargets}
          calorieTarget={calorieTarget}
          achieved={{ kcal: totalKcal, protein_g: totalProtein, carbs_g: totalCarbs, fat_g: totalFat }}
          isTrainingDay={isTrainingDay}
        />
      </div>

      {/* Common meal quick-add */}
      {(isToday || isFuture) && (
        <div className="animate-fade-up-2">
          <CommonMealPicker date={selectedDate} />
        </div>
      )}

      {/* Meal list */}
      {isLoading ? (
        <div className="space-y-3 animate-fade-up-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[.05] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-ink-tertiary space-y-1 animate-fade-up-3">
          <p>No meal plan {isFuture ? 'for this day yet' : 'for today yet'}.</p>
          <p className="text-ink-muted text-xs">Ask Claude to plan your meals via the MCP server.</p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up-3">
          {sorted.map((meal) => (
            <MealPlanCard key={meal.id} meal={meal} readOnly={!isToday} onDelete={deleteMeal} />
          ))}
        </div>
      )}
    </div>
  );
}
