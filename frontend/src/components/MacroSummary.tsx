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

  const rows = [
    { label: 'Calories', value: Math.round(achieved.kcal), target: kcalTarget, unit: 'kcal' },
    { label: 'Protein', value: Math.round(achieved.protein_g), target: dayTargets?.protein_g ?? null, unit: 'g' },
    { label: 'Carbs', value: Math.round(achieved.carbs_g), target: dayTargets?.carbs_g ?? null, unit: 'g' },
    { label: 'Fat', value: Math.round(achieved.fat_g), target: dayTargets?.fat_g ?? null, unit: 'g' },
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
