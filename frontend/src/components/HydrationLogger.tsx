import { useState } from "react";
import { useLogWater } from "../hooks/useToday.ts";

const QUICK_AMOUNTS = [150, 250, 300, 500, 750];

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HydrationLogger() {
  const [custom, setCustom] = useState("");
  const { mutate, isPending } = useLogWater();

  function log(ml: number) {
    if (ml > 0) mutate({ amount_ml: ml, date: localDateStr() });
    setCustom("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-700">Log water</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => log(ml)}
            disabled={isPending}
            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50"
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
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={() => log(Number(custom))}
          disabled={isPending || !custom}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition-colors"
        >
          Log
        </button>
      </div>
    </div>
  );
}
