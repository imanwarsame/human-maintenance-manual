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
  isTrainingDay: boolean;
}

export default function MacroSummary({ macroTargets, calorieTarget, achieved, isTrainingDay }: Props) {
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

  if (!hasCalories && macroRows.length === 0) return null;

  return (
    <div className="space-y-5">
      {hasCalories && (
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-gray-900">{kcalAchieved.toLocaleString()}</span>
            {kcalTarget != null && (
              <span className="text-sm text-gray-400">/ {kcalTarget.toLocaleString()} kcal</span>
            )}
          </div>
          {kcalTarget != null && (
            <div className="w-full bg-gray-100 rounded-full h-0.5">
              <div
                className={`h-0.5 rounded-full transition-all ${macroBarColor(kcalAchieved, kcalTarget)}`}
                style={{ width: `${Math.min(100, (achieved.kcal / kcalTarget) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {macroRows.length > 0 && (
        <div className="grid grid-cols-3 gap-x-4">
          {macroRows.map(({ label, value, target, unit }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
                <span className="text-xs text-gray-700 font-medium">
                  {value}
                  {target != null ? (
                    <span className="text-gray-400 font-normal">/{target}{unit}</span>
                  ) : (
                    <span className="text-gray-400 font-normal">{unit}</span>
                  )}
                </span>
              </div>
              {target != null && (
                <div className="w-full bg-gray-100 rounded-full h-0.5">
                  <div
                    className={`h-0.5 rounded-full transition-all ${macroBarColor(value, target)}`}
                    style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
