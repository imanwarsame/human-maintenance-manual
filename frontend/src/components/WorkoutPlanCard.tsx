import { useState } from 'react';
import type { Exercise } from '../types/index.ts';

const TYPE_EMOJI: Record<string, string> = {
  strength: '💪',
  football: '⚽',
  cycling: '🚴',
  swim: '🏊',
  other: '🏋️',
};

interface Props {
  type: string;
  notes: string | null;
  duration_mins: number | null;
  exercises: Exercise[];
}

export default function WorkoutPlanCard({ type, notes, duration_mins, exercises }: Props) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setTicked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const emoji = TYPE_EMOJI[type] ?? '🏋️';
  const done = ticked.size;
  const total = exercises.length;

  return (
    <div className="bg-white rounded-xl border border-brand-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 capitalize">{type} session</p>
            {duration_mins && (
              <p className="text-xs text-gray-400">{duration_mins} min</p>
            )}
          </div>
        </div>
        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
          Planned
        </span>
      </div>

      {notes && <p className="text-xs text-gray-500 italic">{notes}</p>}

      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Exercises · {done}/{total}
          </p>
          {exercises.map((ex, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="flex items-center gap-3 w-full text-left"
            >
              <span
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  ticked.has(i)
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-gray-300'
                }`}
              >
                {ticked.has(i) && <span className="text-white text-[9px] leading-none">✓</span>}
              </span>
              <span className={`text-sm ${ticked.has(i) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {ex.name}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {ex.sets}×{ex.reps}
                {ex.weight_kg ? ` · ${ex.weight_kg} kg` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
