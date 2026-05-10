import { useState, useEffect } from 'react';
import type { MacroTargets, MacroDay } from '../types/index.ts';

function macroBarColor(achieved: number, target: number): string {
  const pct = target > 0 ? achieved / target : 0;
  if (pct > 1.1) return 'bg-red-500';
  if (pct >= 0.8) return 'bg-green-500';
  return 'bg-amber-500';
}

interface Props {
  macroTargets: MacroTargets | null;
  calorieTarget: number | null;
  achieved: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  isTrainingDay: boolean;
}

export default function MacroSummary({ macroTargets, calorieTarget, achieved, isTrainingDay }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const dayTargets: MacroDay | null = macroTargets
    ? (isTrainingDay ? macroTargets.training : macroTargets.rest)
    : null;
  const kcalTarget = dayTargets?.kcal ?? calorieTarget;
  const kcalAchieved = Math.round(achieved.kcal);

  const macroRows = [
    { label: 'Protein', value: Math.round(achieved.protein_g), target: dayTargets?.protein_g ?? null, unit: 'g' },
    { label: 'Carbs',   value: Math.round(achieved.carbs_g),   target: dayTargets?.carbs_g ?? null,   unit: 'g' },
    { label: 'Fat',     value: Math.round(achieved.fat_g),     target: dayTargets?.fat_g ?? null,     unit: 'g' },
  ].filter((r) => r.target != null || r.value > 0);

  const hasCalories = kcalTarget != null || achieved.kcal > 0;

  if (!hasCalories && macroRows.length === 0) return null;

  return (
    <div className="space-y-5">
      {hasCalories && (
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-ink-primary num">{kcalAchieved.toLocaleString()}</span>
            {kcalTarget != null && (
              <span className="text-sm text-ink-tertiary num">/ {kcalTarget.toLocaleString()} kcal</span>
            )}
          </div>
          {kcalTarget != null && (
            <div className="w-full bg-white/[.06] rounded-full h-0.5">
              <div
                className={`h-0.5 rounded-full transition-[width] duration-700 ease-out ${macroBarColor(kcalAchieved, kcalTarget)}`}
                style={{ width: mounted ? `${Math.min(100, (achieved.kcal / kcalTarget) * 100)}%` : '0%' }}
              />
            </div>
          )}
        </div>
      )}

      {macroRows.length > 0 && (
        <div className="grid grid-cols-3 gap-x-4">
          {macroRows.map(({ label, value, target, unit }, idx) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">{label}</span>
                <span className="text-xs text-ink-primary font-medium num">
                  {value}
                  {target != null ? (
                    <span className="text-ink-tertiary font-normal">/{target}{unit}</span>
                  ) : (
                    <span className="text-ink-tertiary font-normal">{unit}</span>
                  )}
                </span>
              </div>
              {target != null && (
                <div className="w-full bg-white/[.06] rounded-full h-0.5">
                  <div
                    className={`h-0.5 rounded-full transition-[width] duration-700 ease-out ${macroBarColor(value, target)}`}
                    style={{
                      width: mounted ? `${Math.min(100, (value / target) * 100)}%` : '0%',
                      transitionDelay: `${idx * 80}ms`,
                    }}
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
