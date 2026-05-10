import { useState } from 'react';
import { useLogWater } from '../hooks/useToday.ts';

const QUICK_AMOUNTS = [150, 250, 300, 500, 750, 900];

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HydrationLogger() {
  const [custom, setCustom] = useState('');
  const { mutate, isPending } = useLogWater();

  function log(ml: number) {
    if (ml > 0) mutate({ amount_ml: ml, date: localDateStr() });
    setCustom('');
  }

  return (
    <div className="bg-surface-1 rounded-2xl border border-white/[.07] p-5 space-y-4">
      <p className="text-xs font-semibold text-ink-secondary uppercase tracking-widest">Log water</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => log(ml)}
            disabled={isPending}
            className="px-3 py-2 rounded-xl bg-surface-2 border border-white/[.07] text-blue-400 text-sm font-medium hover:bg-surface-3 hover:border-blue-400/20 active:scale-[.95] transition-all duration-150 disabled:opacity-50 num"
          >
            {ml} ml
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          placeholder="Custom (ml)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="flex-1 bg-surface-2 border border-white/[.09] rounded-xl px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-blue-400/40 focus:border-blue-400/40 transition-colors"
        />
        <button
          onClick={() => log(Number(custom))}
          disabled={isPending || !custom}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors active:scale-[.97]"
        >
          Log
        </button>
      </div>
    </div>
  );
}
