import { useState, useCallback } from 'react';
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
  onDelete?: () => void;
}

export default function WorkoutPlanCard({ activityId, type, notes, duration_mins, exercises, onDelete }: Props) {
  const [completed, setCompleted] = useState<Set<number>>(() => {
    const init = new Set<number>();
    exercises.forEach((ex, i) => { if (ex.completed) init.add(i); });
    return init;
  });
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [localWeights, setLocalWeights] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    exercises.forEach((ex, i) => { if (ex.weight_kg) init[i] = ex.weight_kg; });
    return init;
  });
  const [editingSetsReps, setEditingSetsReps] = useState<number | null>(null);
  const [setsInput, setSetsInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [localSetsReps, setLocalSetsReps] = useState<Record<number, { sets: number; reps: number }>>({});
  const { mutate: updateWeights } = useUpdateExerciseWeights();

  const buildAndPersist = useCallback(
    (
      nextCompleted: Set<number>,
      nextWeights: Record<number, number>,
      nextSetsReps: Record<number, { sets: number; reps: number }> = localSetsReps,
    ) => {
      const updated = exercises.map((ex, idx) => ({
        ...ex,
        sets: nextSetsReps[idx]?.sets ?? ex.sets,
        reps: nextSetsReps[idx]?.reps ?? ex.reps,
        weight_kg: nextWeights[idx] ?? ex.weight_kg,
        completed: nextCompleted.has(idx),
        skipped: false,
      }));
      api.patch(`/api/activities/${activityId}`, { exercises: updated }).catch(() => {});
    },
    [activityId, exercises, localSetsReps],
  );

  function toggle(i: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      buildAndPersist(next, localWeights);
      return next;
    });
  }

  function startEditWeight(i: number) {
    const current = localWeights[i] ?? exercises[i].weight_kg ?? 0;
    setWeightInput(current > 0 ? String(current) : '');
    setEditingWeight(i);
  }

  function saveWeight(i: number) {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) {
      setEditingWeight(null);
      return;
    }
    const nextWeights = { ...localWeights, [i]: val };
    setLocalWeights(nextWeights);
    setEditingWeight(null);
    updateWeights([{ exercise_name: exercises[i].name, weight_kg: val }]);
    buildAndPersist(completed, nextWeights);
  }

  function startEditSetsReps(i: number) {
    const current = localSetsReps[i] ?? { sets: exercises[i].sets, reps: exercises[i].reps };
    setSetsInput(String(current.sets));
    setRepsInput(String(current.reps));
    setEditingSetsReps(i);
  }

  function saveSetsReps(i: number) {
    const sets = parseInt(setsInput, 10);
    const reps = parseInt(repsInput, 10);
    if (!sets || sets <= 0 || !reps || reps <= 0) {
      setEditingSetsReps(null);
      return;
    }
    const nextSetsReps = { ...localSetsReps, [i]: { sets, reps } };
    setLocalSetsReps(nextSetsReps);
    setEditingSetsReps(null);
    buildAndPersist(completed, localWeights, nextSetsReps);
  }

  const emoji = TYPE_EMOJI[type] ?? '🏋️';
  const done = completed.size;
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
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-500 bg-brand-500/[.10] px-2 py-0.5 rounded-full border border-brand-500/20">
            Planned
          </span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-ink-muted hover:text-red-400 transition-colors text-base leading-none active:scale-90"
              aria-label="Delete activity"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {notes && <p className="text-xs text-ink-tertiary italic">{notes}</p>}

      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
            Exercises · <span className="num">{done}/{total}</span>
          </p>
          {exercises.map((ex, i) => {
            const isDone = completed.has(i);
            const displayWeight = localWeights[i] ?? ex.weight_kg;
            const displaySetsReps = localSetsReps[i] ?? { sets: ex.sets, reps: ex.reps };
            return (
              <div key={i} className="flex items-center gap-3 w-full">
                <button
                  onClick={() => toggle(i)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0 active:scale-[.98] transition-transform"
                >
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                      isDone
                        ? 'border-brand-500 bg-brand-500'
                        : 'border-white/[.2] hover:border-brand-500/50'
                    }`}
                  >
                    {isDone && (
                      <span className="text-surface-0 text-[9px] leading-none font-bold">✓</span>
                    )}
                  </span>
                  <span className={`text-sm transition-colors ${isDone ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
                    {ex.name}
                  </span>
                </button>

                {editingSetsReps === i ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={setsInput}
                      onChange={(e) => setSetsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSetsReps(i);
                        if (e.key === 'Escape') setEditingSetsReps(null);
                      }}
                      onBlur={() => saveSetsReps(i)}
                      autoFocus
                      className="w-9 text-xs text-center bg-surface-2 border border-brand-500/40 rounded-md px-1 py-0.5 text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    />
                    <span className="text-xs text-ink-tertiary">×</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSetsReps(i);
                        if (e.key === 'Escape') setEditingSetsReps(null);
                      }}
                      onBlur={() => saveSetsReps(i)}
                      className="w-9 text-xs text-center bg-surface-2 border border-brand-500/40 rounded-md px-1 py-0.5 text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => startEditSetsReps(i)}
                    className="text-xs text-ink-tertiary hover:text-brand-500 shrink-0 transition-colors num"
                    title="Edit sets × reps"
                  >
                    {displaySetsReps.sets}×{displaySetsReps.reps}
                  </button>
                )}

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
    </div>
  );
}
