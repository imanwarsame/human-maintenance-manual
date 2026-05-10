import { useState } from 'react';
import type { Exercise } from '../types/index.ts';
import { useUpdateExerciseWeights } from '../hooks/useExerciseWeights.ts';
import { api } from '../api/client.ts';

const TYPE_EMOJI: Record<string, string> = {
  strength: '💪',
  football: '⚽',
  cycling:  '🚴',
  swim:     '🏊',
  mobility: '🧘',
  other:    '🏋️',
};

interface Props {
  activityId: string;
  type: string;
  notes: string | null;
  duration_mins: number | null;
  exercises: Exercise[];
  onComplete?: () => void;
}

export default function WorkoutPlanCard({ activityId, type, notes, duration_mins, exercises, onComplete }: Props) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [localWeights, setLocalWeights] = useState<Record<number, number>>({});
  const { mutate: updateWeights } = useUpdateExerciseWeights();

  function toggle(i: number) {
    setTicked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function startEditWeight(i: number) {
    const current = localWeights[i] ?? exercises[i].weight_kg ?? 0;
    setWeightInput(current > 0 ? String(current) : '');
    setEditingWeight(i);
  }

  async function saveWeight(i: number) {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) {
      setEditingWeight(null);
      return;
    }
    setLocalWeights((prev) => ({ ...prev, [i]: val }));
    setEditingWeight(null);

    const exerciseName = exercises[i].name;
    updateWeights([{ exercise_name: exerciseName, weight_kg: val }]);

    const updatedExercises = exercises.map((ex, idx) => ({
      ...ex,
      weight_kg: idx === i ? val : (localWeights[idx] ?? ex.weight_kg),
    }));
    api.patch(`/api/activities/${activityId}`, { exercises: updatedExercises }).catch(() => {});
  }

  const emoji = TYPE_EMOJI[type] ?? '🏋️';
  const done = ticked.size;
  const total = exercises.length;

  return (
    <div className="bg-surface-1 rounded-xl border border-brand-500/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <p className="text-sm font-semibold text-ink-primary capitalize">{type} session</p>
            {duration_mins && (
              <p className="text-xs text-ink-tertiary num">{duration_mins} min</p>
            )}
          </div>
        </div>
        <span className="text-xs font-semibold text-brand-500 bg-brand-500/[.10] px-2 py-0.5 rounded-full border border-brand-500/20">
          Planned
        </span>
      </div>

      {notes && <p className="text-xs text-ink-tertiary italic">{notes}</p>}

      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
            Exercises · <span className="num">{done}/{total}</span>
          </p>
          {exercises.map((ex, i) => {
            const displayWeight = localWeights[i] ?? ex.weight_kg;
            return (
              <div key={i} className="flex items-center gap-3 w-full">
                <button
                  onClick={() => toggle(i)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0 active:scale-[.98] transition-transform"
                >
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                      ticked.has(i)
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-white/[.2] hover:border-brand-500/50'
                    }`}
                  >
                    {ticked.has(i) && (
                      <span className="text-surface-0 text-[9px] leading-none font-bold animate-fade-in">✓</span>
                    )}
                  </span>
                  <span className={`text-sm transition-colors ${ticked.has(i) ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
                    {ex.name}
                  </span>
                  <span className="ml-auto text-xs text-ink-tertiary shrink-0 num">
                    {ex.sets}×{ex.reps}
                  </span>
                </button>

                {editingWeight === i ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveWeight(i);
                        if (e.key === 'Escape') setEditingWeight(null);
                      }}
                      onBlur={() => saveWeight(i)}
                      autoFocus
                      className="w-14 text-xs text-center bg-surface-2 border border-brand-500/40 rounded-md px-1 py-0.5 text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    />
                    <span className="text-xs text-ink-tertiary">kg</span>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditWeight(i)}
                    className="text-xs text-ink-tertiary hover:text-brand-500 shrink-0 transition-colors min-w-[44px] text-right num"
                    title="Edit weight"
                  >
                    {displayWeight ? `${displayWeight} kg` : '+ kg'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {onComplete && (
        <button
          onClick={onComplete}
          className="w-full py-2 rounded-xl bg-brand-500 text-surface-0 text-sm font-semibold hover:bg-brand-600 transition-colors active:scale-[.98]"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
