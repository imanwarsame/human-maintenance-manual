import { useState } from 'react';
import type { DeviationType } from '../types/index.ts';
import { useLogDeviation } from '../hooks/useToday.ts';

const DEVIATION_OPTIONS: { value: DeviationType; label: string }[] = [
  { value: 'skipped', label: 'Skipped' },
  { value: 'swapped', label: 'Swapped for something else' },
  { value: 'ate_out', label: 'Ate out' },
  { value: 'extras', label: 'Had extras' },
];

interface Props {
  mealId: string;
  onClose: () => void;
}

export default function DeviationModal({ mealId, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [deviationType, setDeviationType] = useState<DeviationType>('swapped');
  const [kcal, setKcal] = useState('');
  const [proteinG, setProteinG] = useState('');
  const { mutate, isPending } = useLogDeviation();

  function submit() {
    if (!description.trim()) return;
    mutate(
      {
        mealId,
        body: {
          description: description.trim(),
          deviation_type: deviationType,
          kcal: kcal ? Number(kcal) : undefined,
          protein_g: proteinG ? Number(proteinG) : undefined,
        },
      },
      { onSuccess: onClose }
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Log deviation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">What happened?</label>
          <select
            value={deviationType}
            onChange={(e) => setDeviationType(e.target.value as DeviationType)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {DEVIATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Ate out at Nando's, had half portion"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Calories (optional)</label>
            <input
              type="number"
              min={0}
              placeholder="kcal"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Protein (optional)</label>
            <input
              type="number"
              min={0}
              placeholder="grams"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending || !description.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : 'Save deviation'}
          </button>
        </div>
      </div>
    </div>
  );
}
