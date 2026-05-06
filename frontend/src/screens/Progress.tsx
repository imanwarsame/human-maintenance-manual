import { useState } from 'react';
import {
  useProgress,
  useLogBodyWeight,
  type VolumeByMuscle,
  type ExerciseHistory,
  type RunTimeEntry,
  type BodyWeightEntry,
} from '../hooks/useProgress.ts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Muscle group colours ────────────────────────────────────────────────────

const MUSCLE_COLOURS: Record<string, string> = {
  Chest: '#f97316',
  Back: '#06b6d4',
  Legs: '#eab308',
  Shoulders: '#8b5cf6',
  Biceps: '#3b82f6',
  Triceps: '#22c55e',
  Core: '#ef4444',
  Other: '#9ca3af',
};

// ─── Chart primitives ────────────────────────────────────────────────────────

function Sparkline({ values, color = '#8b5cf6' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 80, H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - 2 - ((v - min) / range) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LineChart({
  data,
  formatY,
  color = '#8b5cf6',
  invertY = false,
}: {
  data: { x: string; y: number }[];
  formatY: (v: number) => string;
  color?: string;
  invertY?: boolean;
}) {
  if (data.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-6">Not enough data yet</p>;
  }
  const W = 400, H = 130;
  const PAD = { top: 10, right: 12, bottom: 28, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => {
    const norm = (v - minY) / rangeY;
    const pos = invertY ? norm : 1 - norm;
    return PAD.top + pos * innerH;
  };

  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.y).toFixed(1)}`).join(' ');
  const ticks = [minY, minY + rangeY / 2, maxY];
  const xLabels = [
    { i: 0, anchor: 'start' as const },
    { i: Math.floor((data.length - 1) / 2), anchor: 'middle' as const },
    { i: data.length - 1, anchor: 'end' as const },
  ].filter((l, idx, arr) => arr.findIndex((ll) => ll.i === l.i) === idx);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {ticks.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
              {formatY(v)}
            </text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.y)} r="3" fill={color} />
      ))}
      {xLabels.map(({ i, anchor }) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor={anchor as 'start' | 'middle' | 'end'} fontSize="9" fill="#9ca3af">
          {data[i].x}
        </text>
      ))}
    </svg>
  );
}

function MiniLineChart({ data, color }: { data: { x: string; y: number }[]; color: string }) {
  if (data.length < 2) return <p className="text-xs text-gray-400 py-2">Not enough data yet</p>;
  const W = 400, H = 70;
  const PAD = { top: 6, right: 10, bottom: 18, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / rangeY) * innerH;
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.y).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <line x1={PAD.left} x2={W - PAD.right} y1={toY(minY)} y2={toY(minY)} stroke="#f3f4f6" strokeWidth="1" />
      <line x1={PAD.left} x2={W - PAD.right} y1={toY(maxY)} y2={toY(maxY)} stroke="#f3f4f6" strokeWidth="1" />
      <text x={PAD.left - 4} y={toY(minY) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{minY.toFixed(1)}</text>
      <text x={PAD.left - 4} y={toY(maxY) + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{maxY.toFixed(1)}</text>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.y)} r="2" fill={color} />
      ))}
      <text x={toX(0)} y={H - 2} textAnchor="start" fontSize="8" fill="#9ca3af">{data[0].x}</text>
      <text x={toX(data.length - 1)} y={H - 2} textAnchor="end" fontSize="8" fill="#9ca3af">{data[data.length - 1].x}</text>
    </svg>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function WeeklyVolumeSection({ data }: { data: VolumeByMuscle[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No strength sessions logged this week.</p>;
  }
  const max = Math.max(...data.map((d) => d.volume), 1);
  return (
    <div className="space-y-2.5">
      {data.map(({ muscle_group, volume, sets }) => {
        const color = MUSCLE_COLOURS[muscle_group] ?? MUSCLE_COLOURS.Other;
        return (
          <div key={muscle_group} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{muscle_group}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(volume / max) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs text-gray-500 w-24 shrink-0">
              {volume > 0 ? `${Math.round(volume).toLocaleString()} kg` : `${sets} sets`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ExerciseCard({ ex }: { ex: ExerciseHistory }) {
  const values = ex.history.map((h) => h.weight_kg);
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const trend = prev == null ? null : last > prev ? '↑' : last < prev ? '↓' : '→';
  const trendColor =
    trend === '↑' ? 'text-green-500' : trend === '↓' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-medium text-gray-700 leading-tight">{ex.name}</p>
        {trend && <span className={`text-sm font-bold shrink-0 ${trendColor}`}>{trend}</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900 leading-none">{ex.pr_kg}</p>
          <p className="text-xs text-gray-400 mt-0.5">kg PR</p>
        </div>
        <div className="text-violet-500">
          <Sparkline values={values} />
        </div>
      </div>
    </div>
  );
}

function RunTimesSection({ data }: { data: RunTimeEntry[] }) {
  const chartData = data.map((d) => ({ x: formatDate(d.date), y: d.elapsed_secs }));
  return (
    <>
      {data.length > 0 && (
        <p className="text-xs text-gray-400 text-right mb-1">lower = faster</p>
      )}
      <LineChart data={chartData} formatY={formatTime} color="#f97316" />
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Best: {formatTime(Math.min(...data.map((d) => d.elapsed_secs)))}</span>
          <span>Latest: {formatTime(data[data.length - 1].elapsed_secs)}</span>
        </div>
      )}
    </>
  );
}

// ─── Body metrics (weight + composition) ────────────────────────────────────

function BodyMetricsSection({ data }: { data: BodyWeightEntry[] }) {
  const today = toDateStr(new Date());
  const [inputDate, setInputDate] = useState(today);
  const [inputWeight, setInputWeight] = useState('');
  const [inputFat, setInputFat] = useState('');
  const [inputMuscle, setInputMuscle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { mutate, isPending } = useLogBodyWeight();

  // When date changes, pre-fill from existing data if available
  function handleDateChange(d: string) {
    setInputDate(d);
    const existing = data.find((e) => e.date === d);
    if (existing) {
      setInputWeight(String(existing.weight_kg));
      setInputFat(existing.body_fat_pct != null ? String(existing.body_fat_pct) : '');
      setInputMuscle(existing.muscle_mass_kg != null ? String(existing.muscle_mass_kg) : '');
    } else {
      setInputWeight('');
      setInputFat('');
      setInputMuscle('');
    }
  }

  function handleEdit(entry: BodyWeightEntry) {
    setInputDate(entry.date);
    setInputWeight(String(entry.weight_kg));
    setInputFat(entry.body_fat_pct != null ? String(entry.body_fat_pct) : '');
    setInputMuscle(entry.muscle_mass_kg != null ? String(entry.muscle_mass_kg) : '');
    setShowHistory(false);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(inputWeight);
    if (!w || w <= 0) return;
    const fat = inputFat !== '' ? parseFloat(inputFat) : null;
    const muscle = inputMuscle !== '' ? parseFloat(inputMuscle) : null;
    mutate(
      { date: inputDate, weight_kg: w, body_fat_pct: fat, muscle_mass_kg: muscle },
      {
        onSuccess: () => {
          if (inputDate === today) {
            setInputWeight('');
            setInputFat('');
            setInputMuscle('');
          }
        },
      },
    );
  }

  const latest = data[data.length - 1];
  const weightChartData = data.map((d) => ({ x: formatDate(d.date), y: d.weight_kg }));
  const fatData = data.filter((d) => d.body_fat_pct != null) as (BodyWeightEntry & { body_fat_pct: number })[];
  const muscleData = data.filter((d) => d.muscle_mass_kg != null) as (BodyWeightEntry & { muscle_mass_kg: number })[];
  const fatChartData = fatData.map((d) => ({ x: formatDate(d.date), y: d.body_fat_pct }));
  const muscleChartData = muscleData.map((d) => ({ x: formatDate(d.date), y: d.muscle_mass_kg }));

  const isEditing = data.some((e) => e.date === inputDate);

  return (
    <div className="space-y-5">
      {/* Weight — prominent */}
      <div className="space-y-3">
        {latest && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">{latest.weight_kg}</span>
            <span className="text-sm text-gray-500">kg · {formatDate(latest.date)}</span>
          </div>
        )}
        <LineChart data={weightChartData} formatY={(v) => `${v}kg`} color="#06b6d4" />
      </div>

      {/* Body composition — discreet */}
      {(fatData.length > 0 || muscleData.length > 0) && (
        <div className="space-y-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {fatData.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Body fat</p>
                <p className="text-sm font-medium text-gray-600">
                  {fatData[fatData.length - 1].body_fat_pct}%
                </p>
              </div>
            )}
            {muscleData.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Muscle mass</p>
                <p className="text-sm font-medium text-gray-600">
                  {muscleData[muscleData.length - 1].muscle_mass_kg} kg
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fatChartData.length >= 2 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Fat %</p>
                <MiniLineChart data={fatChartData} color="#f97316" />
              </div>
            )}
            {muscleChartData.length >= 2 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Muscle kg</p>
                <MiniLineChart data={muscleChartData} color="#22c55e" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* History list */}
      {data.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showHistory ? 'Hide history' : `Show history (${data.length} entries)`}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {[...data].reverse().map((entry) => (
                <button
                  key={entry.date}
                  onClick={() => handleEdit(entry)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-xs text-gray-500">{formatDate(entry.date)}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-700">
                    <span>{entry.weight_kg} kg</span>
                    {entry.body_fat_pct != null && (
                      <span className="text-gray-400">{entry.body_fat_pct}% fat</span>
                    )}
                    {entry.muscle_mass_kg != null && (
                      <span className="text-gray-400">{entry.muscle_mass_kg} kg muscle</span>
                    )}
                    <span className="text-gray-300 text-xs">edit</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log / edit form */}
      <form onSubmit={handleSubmit} className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            placeholder="kg"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min="1"
            max="100"
            placeholder="fat %"
            value={inputFat}
            onChange={(e) => setInputFat(e.target.value)}
            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="number"
            step="0.1"
            min="10"
            max="150"
            placeholder="muscle kg"
            value={inputMuscle}
            onChange={(e) => setInputMuscle(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-500 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            type="submit"
            disabled={isPending || !inputWeight}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            {isEditing ? 'Update' : 'Log'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

export default function Progress() {
  const { data, isLoading, isError } = useProgress();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Progress</h1>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-red-500 text-center py-8">Failed to load progress data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Progress</h1>

      <SectionCard title="This Week's Volume">
        <WeeklyVolumeSection data={data.weeklyVolume} />
      </SectionCard>

      {data.exerciseHistory.length > 0 && (
        <SectionCard title="Exercise Progress · 90 days">
          <div className="grid grid-cols-2 gap-2">
            {data.exerciseHistory.map((ex) => (
              <ExerciseCard key={ex.name} ex={ex} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="5K Times">
        <RunTimesSection data={data.runTimes} />
      </SectionCard>

      <SectionCard title="Body Weight">
        <BodyMetricsSection data={data.bodyWeight} />
      </SectionCard>
    </div>
  );
}
