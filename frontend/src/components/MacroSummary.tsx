import type { MacroTargets, MacroDay } from '../types/index.ts';

function macroBarColor(achieved: number, target: number): string {
  const pct = target > 0 ? achieved / target : 0;
  if (pct > 1.1) return 'bg-red-400';
  if (pct >= 0.8) return 'bg-green-400';
  return 'bg-amber-400';
}

interface Props {
  macroTargets: MacroTargets | null;
  calorieTarget: number | null;
  achieved: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  mealsEaten: number;
  mealsTotal: number;
  isTrainingDay: boolean;
}

export default function MacroSummary({ macroTargets, calorieTarget, achieved, mealsEaten, mealsTotal, isTrainingDay }: Props) {
  const dayTargets: MacroDay | null = macroTargets
    ? (isTrainingDay ? macroTargets.training : macroTargets.rest)
    : null;
  const kcalTarget = dayTargets?.kcal ?? calorieTarget;
  const kcalAchieved = Math.round(achieved.kcal);

  const macroRows = [
    { label: 'Protein', value: Math.round(achieved.protein_g), target: dayTargets?.protein_g ?? null, unit: 'g' },
    { label: 'Carbs', value: Math.round(achieved.carbs_g), target: dayTargets?.carbs_g ?? null, unit: 'g' },
    { label: 'Fat', value: Math.round(achieved.fat_g), target: dayTargets?.fat_g ?? null, unit: 'g' },
  ].filter((r) => r.target != null || r.value > 0);

  const hasCalories = kcalTarget != null || achieved.kcal > 0;

  if (!hasCalories && macroRows.length === 0 && mealsTotal === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2.5">
      {/* Calories — clearly labelled running total vs target */}
      {hasCalories && (
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Running total</p>
              <p className="text-lg font-bold text-gray-800">{kcalAchieved.toLocaleString()} kcal</p>
            </div>
            {kcalTarget != null && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Today's target</p>
                <p className="text-lg font-semibold text-gray-500">{kcalTarget.toLocaleString()} kcal</p>
              </div>
            )}
          </div>
          {kcalTarget != null && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full transition-all ${macroBarColor(kcalAchieved, kcalTarget)}`}
                style={{ width: `${Math.min(100, (achieved.kcal / kcalTarget) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Protein / Carbs / Fat */}
      {macroRows.length > 0 && (
        <div className={`grid grid-cols-3 gap-x-3 ${hasCalories ? 'pt-2 border-t border-gray-50' : ''}`}>
          {macroRows.map(({ label, value, target, unit }) => (
            <div key={label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs">
                  <span className="font-semibold text-gray-800">{value}</span>
                  {target != null ? (
                    <span className="text-gray-400">/{target}{unit}</span>
                  ) : (
                    <span className="text-gray-400">{unit}</span>
                  )}
                </span>
              </div>
              {target != null && (
                <div className="w-full bg-gray-100 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${macroBarColor(value, target)}`}
                    style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
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
