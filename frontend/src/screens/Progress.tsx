import { useState, useEffect, useRef } from 'react';
import {
  useProgress,
  useLogBodyWeight,
  type VolumeByMuscle,
  type ExerciseHistory,
  type RunTimeEntry,
  type BodyWeightEntry,
  type WellnessEntry,
} from '../hooks/useProgress.ts';
import { useTrainingLoad, type TrainingLoadSummary, type DailyLoad, type AcwrBand } from '../hooks/useTrainingLoad.ts';
import { useReadinessSeries } from '../hooks/useReadiness.ts';
import { useWeeklyNote } from '../hooks/useToday.ts';
import { useCorrelations, type CorrelationResult } from '../hooks/useCorrelations.ts';
import type { CoachingNote } from '../types/index.ts';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView] as const;
}

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

const MUSCLE_COLOURS: Record<string, string> = {
  Chest:     '#f97316',
  Back:      '#06b6d4',
  Legs:      '#eab308',
  Shoulders: '#8b5cf6',
  Biceps:    '#3b82f6',
  Triceps:   '#22c55e',
  Core:      '#ef4444',
  Other:     '#6b7280',
};

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

function useDragIndex(dataLength: number, W: number, padLeft: number, innerW: number) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const draggingRef = useRef(false);

  function indexFromClientX(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || dataLength < 2) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const scale = W / rect.width;
    const vbX = (clientX - rect.left) * scale;
    const raw = ((vbX - padLeft) / innerW) * (dataLength - 1);
    return Math.min(dataLength - 1, Math.max(0, Math.round(raw)));
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveIndex(indexFromClientX(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    setActiveIndex(indexFromClientX(e.clientX));
  }
  function endDrag() {
    draggingRef.current = false;
    setActiveIndex(null);
  }

  return {
    svgRef,
    activeIndex,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerLeave: endDrag,
    },
  };
}

function ChartTooltip({
  x,
  y,
  W,
  H,
  label,
  value,
}: {
  x: number;
  y: number;
  W: number;
  H: number;
  label: string;
  value: string;
}) {
  const leftPct = Math.min(88, Math.max(12, (x / W) * 100));
  const topPct = Math.max(0, (y / H) * 100);
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] bg-surface-0/95 border border-white/10 rounded-lg px-2 py-1 shadow-lg text-xs whitespace-nowrap z-10"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      <span className="text-ink-tertiary">{label}</span>{' '}
      <span className="text-ink-primary font-semibold num">{value}</span>
    </div>
  );
}

function LineChart({
  data,
  formatY,
  color = '#8b5cf6',
  invertY = false,
  domain,
}: {
  data: { x: string; y: number }[];
  formatY: (v: number) => string;
  color?: string;
  invertY?: boolean;
  domain?: [number, number];
}) {
  const W = 400, H = 130;
  const PAD = { top: 10, right: 12, bottom: 28, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const { svgRef, activeIndex, handlers } = useDragIndex(data.length, W, PAD.left, innerW);

  if (data.length < 2) {
    return <p className="text-sm text-ink-tertiary text-center py-6">Not enough data yet</p>;
  }

  const ys = data.map((d) => d.y);
  const minY = domain ? domain[0] : Math.min(...ys);
  const maxY = domain ? domain[1] : Math.max(...ys);
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

  const active = activeIndex != null ? data[activeIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none cursor-crosshair select-none"
        style={{ height: H }}
        {...handlers}
      >
        {ticks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">
                {formatY(v)}
              </text>
            </g>
          );
        })}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.y)} r="3" fill={color} />
        ))}
        {active && activeIndex != null && (
          <>
            <line
              x1={toX(activeIndex)}
              x2={toX(activeIndex)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle cx={toX(activeIndex)} cy={toY(active.y)} r="5" fill={color} stroke="white" strokeWidth="1.5" />
          </>
        )}
        {xLabels.map(({ i, anchor }) => (
          <text key={i} x={toX(i)} y={H - 6} textAnchor={anchor as 'start' | 'middle' | 'end'} fontSize="9" fill="rgba(255,255,255,0.35)">
            {data[i].x}
          </text>
        ))}
      </svg>
      {active && activeIndex != null && (
        <ChartTooltip x={toX(activeIndex)} y={toY(active.y)} W={W} H={H} label={active.x} value={formatY(active.y)} />
      )}
    </div>
  );
}

function MiniLineChart({
  data,
  color,
  formatY = (v) => v.toFixed(1),
}: {
  data: { x: string; y: number }[];
  color: string;
  formatY?: (v: number) => string;
}) {
  const W = 400, H = 70;
  const PAD = { top: 6, right: 10, bottom: 18, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const { svgRef, activeIndex, handlers } = useDragIndex(data.length, W, PAD.left, innerW);

  if (data.length < 2) return <p className="text-xs text-ink-tertiary py-2">Not enough data yet</p>;

  const ys = data.map((d) => d.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / rangeY) * innerH;
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.y).toFixed(1)}`).join(' ');
  const active = activeIndex != null ? data[activeIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none cursor-crosshair select-none"
        style={{ height: H }}
        {...handlers}
      >
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(minY)} y2={toY(minY)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(maxY)} y2={toY(maxY)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <text x={PAD.left - 4} y={toY(minY) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">{formatY(minY)}</text>
        <text x={PAD.left - 4} y={toY(maxY) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">{formatY(maxY)}</text>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.y)} r="2" fill={color} />
        ))}
        {active && activeIndex != null && (
          <>
            <line
              x1={toX(activeIndex)}
              x2={toX(activeIndex)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <circle cx={toX(activeIndex)} cy={toY(active.y)} r="4" fill={color} stroke="white" strokeWidth="1.25" />
          </>
        )}
        <text x={toX(0)} y={H - 2} textAnchor="start" fontSize="8" fill="rgba(255,255,255,0.35)">{data[0].x}</text>
        <text x={toX(data.length - 1)} y={H - 2} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">{data[data.length - 1].x}</text>
      </svg>
      {active && activeIndex != null && (
        <ChartTooltip x={toX(activeIndex)} y={toY(active.y)} W={W} H={H} label={active.x} value={formatY(active.y)} />
      )}
    </div>
  );
}

const ACWR_BAND_META: Record<AcwrBand, { label: string; color: string }> = {
  undertrained: { label: 'Undertrained', color: '#3b82f6' },
  optimal: { label: 'Optimal', color: '#22c55e' },
  caution: { label: 'Caution', color: '#eab308' },
  high_risk: { label: 'High risk', color: '#ef4444' },
};

function LoadBars({ data }: { data: DailyLoad[] }) {
  const W = 400, H = 60;
  const PAD = { top: 4, right: 4, bottom: 4, left: 4 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map((d) => d.load), 1);
  const barW = innerW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {data.map((d, i) => {
        const h = (d.load / max) * innerH;
        const x = PAD.left + i * barW;
        const y = PAD.top + innerH - h;
        return (
          <rect
            key={d.date}
            x={x + 0.5}
            y={y}
            width={Math.max(barW - 1, 1)}
            height={d.load > 0 ? Math.max(h, 1) : 0}
            fill="#8b5cf6"
            opacity={i >= data.length - 7 ? 1 : 0.4}
            rx="1"
          />
        );
      })}
    </svg>
  );
}

function TrainingLoadSection({ data }: { data: TrainingLoadSummary }) {
  const bandMeta = data.band ? ACWR_BAND_META[data.band] : null;
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-ink-primary num leading-none">
            {data.acwr != null ? data.acwr.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-ink-tertiary mt-1">ACWR (7d : 28d avg)</p>
        </div>
        {bandMeta ? (
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ color: bandMeta.color, backgroundColor: `${bandMeta.color}1a` }}
          >
            {bandMeta.label}
          </span>
        ) : (
          <span className="text-xs text-ink-muted text-right">
            Building baseline<br />({data.chronic_days_available}/21d)
          </span>
        )}
      </div>
      <LoadBars data={data.daily_loads} />
      <div className="flex justify-between text-xs text-ink-tertiary num">
        <span>Acute 7d: {data.acute_7d}</span>
        <span>Chronic wk avg: {data.chronic_28d_weekly}</span>
      </div>
      {data.projected.planned_load > 0 && (
        <p className="text-xs text-ink-tertiary pt-1 border-t border-white/[.07]">
          Planned this week: {data.projected.planned_load} load
          {data.projected.acwr_next_7d != null && ` · projected ACWR ${data.projected.acwr_next_7d.toFixed(2)}`}
        </p>
      )}
    </div>
  );
}

function WeeklyDigestSection({ note }: { note: CoachingNote }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className="pl-3 border-l-2 border-brand-500/40">
        <p
          className={`text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {note.content}
        </p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        <p className="text-xs text-ink-muted num">
          {new Date(note.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
    </div>
  );
}

function ReadinessSection({ data }: { data: { date: string; score: number | null }[] }) {
  const chartData = data
    .filter((d): d is { date: string; score: number } => d.score != null)
    .map((d) => ({ x: formatDate(d.date), y: d.score }));
  if (chartData.length < 2) {
    return <p className="text-sm text-ink-tertiary text-center py-6">Not enough data yet</p>;
  }
  const latest = chartData[chartData.length - 1];
  return (
    <>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-tertiary">latest</span>
        <span className="text-sm font-medium text-ink-secondary num">{latest.y}/100</span>
      </div>
      <LineChart data={chartData} formatY={(v) => v.toFixed(0)} color="#8b5cf6" domain={[0, 100]} />
    </>
  );
}

function WeeklyVolumeSection({ data }: { data: VolumeByMuscle[] }) {
  const [ref, inView] = useInView();

  if (data.length === 0) {
    return <p className="text-sm text-ink-tertiary text-center py-4">No strength sessions logged this week.</p>;
  }
  const max = Math.max(...data.map((d) => d.volume), 1);
  return (
    <div ref={ref} className="space-y-3">
      {data.map(({ muscle_group, volume, sets }, idx) => {
        const color = MUSCLE_COLOURS[muscle_group] ?? MUSCLE_COLOURS.Other;
        return (
          <div key={muscle_group} className="flex items-center gap-3">
            <span className="text-xs text-ink-tertiary w-20 shrink-0 text-right">{muscle_group}</span>
            <div className="flex-1 bg-white/[.06] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: inView ? `${(volume / max) * 100}%` : '0%',
                  backgroundColor: color,
                  transitionDelay: `${idx * 60}ms`,
                }}
              />
            </div>
            <span className="text-xs text-ink-secondary w-24 shrink-0 num">
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
    trend === '↑' ? 'text-green-400' : trend === '↓' ? 'text-red-400' : 'text-ink-tertiary';

  return (
    <div className="bg-surface-2 rounded-xl border border-white/[.07] p-3 space-y-2 hover:-translate-y-0.5 transition-transform duration-150">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-medium text-ink-primary leading-tight">{ex.name}</p>
        {trend && <span className={`text-sm font-bold shrink-0 ${trendColor}`}>{trend}</span>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-ink-primary leading-none num">{ex.pr_kg}</p>
          <p className="text-xs text-ink-tertiary mt-0.5">kg PR</p>
        </div>
        <Sparkline values={values} color="#8b5cf6" />
      </div>
    </div>
  );
}

function RunTimesSection({ data }: { data: RunTimeEntry[] }) {
  const chartData = data.map((d) => ({ x: formatDate(d.date), y: d.elapsed_secs }));
  return (
    <>
      {data.length > 0 && (
        <p className="text-xs text-ink-tertiary text-right mb-1">lower = faster</p>
      )}
      <LineChart data={chartData} formatY={formatTime} color="#f97316" />
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-ink-secondary mt-2 num">
          <span>Best: {formatTime(Math.min(...data.map((d) => d.elapsed_secs)))}</span>
          <span>Latest: {formatTime(data[data.length - 1].elapsed_secs)}</span>
        </div>
      )}
    </>
  );
}

function BodyMetricsSection({ data }: { data: BodyWeightEntry[] }) {
  const today = toDateStr(new Date());
  const [inputDate, setInputDate] = useState(today);
  const [inputWeight, setInputWeight] = useState('');
  const [inputFat, setInputFat] = useState('');
  const [inputMuscle, setInputMuscle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { mutate, isPending } = useLogBodyWeight();

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
      <div className="space-y-3">
        {latest && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-primary num">{latest.weight_kg}</span>
            <span className="text-sm text-ink-tertiary">kg · {formatDate(latest.date)}</span>
          </div>
        )}
        <LineChart data={weightChartData} formatY={(v) => `${v}kg`} color="#06b6d4" />
      </div>

      {(fatData.length > 0 || muscleData.length > 0) && (
        <div className="space-y-3 pt-1 border-t border-white/[.07]">
          <div className="flex items-center gap-4">
            {fatData.length > 0 && (
              <div>
                <p className="text-xs text-ink-tertiary mb-0.5">Body fat</p>
                <p className="text-sm font-medium text-ink-secondary num">
                  {fatData[fatData.length - 1].body_fat_pct}%
                </p>
              </div>
            )}
            {muscleData.length > 0 && (
              <div>
                <p className="text-xs text-ink-tertiary mb-0.5">Muscle mass</p>
                <p className="text-sm font-medium text-ink-secondary num">
                  {muscleData[muscleData.length - 1].muscle_mass_kg} kg
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fatChartData.length >= 2 && (
              <div>
                <p className="text-xs text-ink-tertiary mb-1">Fat %</p>
                <MiniLineChart data={fatChartData} color="#f97316" />
              </div>
            )}
            {muscleChartData.length >= 2 && (
              <div>
                <p className="text-xs text-ink-tertiary mb-1">Muscle kg</p>
                <MiniLineChart data={muscleChartData} color="#22c55e" />
              </div>
            )}
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors"
          >
            {showHistory ? 'Hide history' : `Show history (${data.length} entries)`}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {[...data].reverse().map((entry) => (
                <button
                  key={entry.date}
                  onClick={() => handleEdit(entry)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-2 transition-colors text-left active:scale-[.98]"
                >
                  <span className="text-xs text-ink-secondary">{formatDate(entry.date)}</span>
                  <div className="flex items-center gap-3 text-xs text-ink-primary num">
                    <span>{entry.weight_kg} kg</span>
                    {entry.body_fat_pct != null && (
                      <span className="text-ink-tertiary">{entry.body_fat_pct}% fat</span>
                    )}
                    {entry.muscle_mass_kg != null && (
                      <span className="text-ink-tertiary">{entry.muscle_mass_kg} kg muscle</span>
                    )}
                    <span className="text-ink-muted text-xs">edit</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={inputDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1.5 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            placeholder="kg"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            className="w-20 bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
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
            className="w-24 bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1.5 text-sm text-ink-secondary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <input
            type="number"
            step="0.1"
            min="10"
            max="150"
            placeholder="muscle kg"
            value={inputMuscle}
            onChange={(e) => setInputMuscle(e.target.value)}
            className="w-28 bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1.5 text-sm text-ink-secondary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
          <button
            type="submit"
            disabled={isPending || !inputWeight}
            className="px-3 py-1.5 rounded-lg bg-brand-500 text-surface-0 text-sm font-semibold disabled:opacity-40 hover:bg-brand-600 transition-colors active:scale-[.97]"
          >
            {isEditing ? 'Update' : 'Log'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface WellnessMetric {
  key: keyof Pick<WellnessEntry, 'sleep_duration_mins' | 'sleep_score' | 'resting_hr' | 'hrv' | 'vo2_max' | 'steps'>;
  label: string;
  color: string;
  toValue: (raw: number) => number;
  formatY: (v: number) => string;
  formatLatest: (v: number) => string;
}

const WELLNESS_METRICS: WellnessMetric[] = [
  {
    key: 'sleep_duration_mins',
    label: 'Sleep',
    color: '#3b82f6',
    toValue: (v) => Math.round((v / 60) * 10) / 10,
    formatY: (v) => `${v.toFixed(1)}h`,
    formatLatest: (v) => `${v.toFixed(1)}h`,
  },
  {
    key: 'sleep_score',
    label: 'Sleep score',
    color: '#8b5cf6',
    toValue: (v) => v,
    formatY: (v) => v.toFixed(0),
    formatLatest: (v) => v.toFixed(0),
  },
  {
    key: 'resting_hr',
    label: 'Resting HR',
    color: '#ef4444',
    toValue: (v) => v,
    formatY: (v) => v.toFixed(0),
    formatLatest: (v) => `${v.toFixed(0)} bpm`,
  },
  {
    key: 'hrv',
    label: 'HRV',
    color: '#22c55e',
    toValue: (v) => v,
    formatY: (v) => v.toFixed(0),
    formatLatest: (v) => `${v.toFixed(0)} ms`,
  },
  {
    key: 'vo2_max',
    label: 'VO2 max',
    color: '#06b6d4',
    toValue: (v) => v,
    formatY: (v) => v.toFixed(1),
    formatLatest: (v) => v.toFixed(1),
  },
  {
    key: 'steps',
    label: 'Steps',
    color: '#eab308',
    toValue: (v) => v,
    formatY: (v) => Math.round(v).toLocaleString(),
    formatLatest: (v) => Math.round(v).toLocaleString(),
  },
];

function WellnessSection({ data }: { data: WellnessEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {WELLNESS_METRICS.map((metric) => {
        const points = data
          .filter((d) => d[metric.key] != null)
          .map((d) => ({ x: formatDate(d.date), y: metric.toValue(d[metric.key] as number) }));
        if (points.length === 0) return null;
        const latest = points[points.length - 1];
        return (
          <div key={metric.key}>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs text-ink-tertiary">{metric.label}</p>
              <p className="text-sm font-medium text-ink-secondary num">{metric.formatLatest(latest.y)}</p>
            </div>
            <MiniLineChart data={points} color={metric.color} formatY={metric.formatY} />
          </div>
        );
      })}
    </div>
  );
}

function PatternsSection({ data }: { data: CorrelationResult[] }) {
  const significant = data.filter((c) => c.significant);
  const rest = data.filter((c) => !c.significant);
  return (
    <div className="space-y-3">
      {significant.length === 0 && (
        <p className="text-xs text-ink-tertiary">
          No strong patterns yet — this fills in as you log more days.
        </p>
      )}
      {significant.map((c) => (
        <p key={`${c.x}-${c.y}-${c.lag_days}`} className="text-sm text-ink-secondary leading-relaxed">
          {c.label}
          {c.r != null && (
            <span className="text-ink-tertiary">
              {' '}(r = {c.r.toFixed(2)}, n = {c.n} days — association, not proof)
            </span>
          )}
        </p>
      ))}
      {rest.length > 0 && (
        <div className="pt-2 border-t border-white/[.07] space-y-1">
          {rest.map((c) => (
            <p key={`${c.x}-${c.y}-${c.lag_days}`} className="text-xs text-ink-muted">
              {c.label}: {c.reason ?? 'not enough data'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className="bg-surface-1 rounded-2xl border border-white/[.07] p-4 space-y-3"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 400ms ease-out, transform 400ms ease-out',
      }}
    >
      <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

export default function Progress() {
  const { data, isLoading, isError } = useProgress();
  const { data: trainingLoad } = useTrainingLoad();
  const today = toDateStr(new Date());
  const thirtyDaysAgo = toDateStr(new Date(Date.now() - 29 * 86_400_000));
  const { data: readinessSeries } = useReadinessSeries(thirtyDaysAgo, today);
  const { data: weeklyNote } = useWeeklyNote();
  // Deferred until the primary content has loaded — it's the heaviest of the Progress
  // tab's requests, so keeping it out of the initial burst lets the rest load faster on
  // the resource-constrained backend, and it's the last section on the page anyway.
  const { data: correlations } = useCorrelations(!isLoading && !!data);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-base font-semibold text-ink-primary tracking-wide">Progress</h1>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/[.05] rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-base font-semibold text-ink-primary tracking-wide">Progress</h1>
        <p className="text-sm text-red-400 text-center py-8">Failed to load progress data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-base font-semibold text-ink-primary tracking-wide animate-fade-up">Progress</h1>

      {weeklyNote && (
        <SectionCard title="This Week's Readout">
          <WeeklyDigestSection note={weeklyNote} />
        </SectionCard>
      )}

      <SectionCard title="This Week's Volume">
        <WeeklyVolumeSection data={data.weeklyVolume} />
      </SectionCard>

      {trainingLoad && (
        <SectionCard title="Training Load · ACWR">
          <TrainingLoadSection data={trainingLoad} />
        </SectionCard>
      )}

      {readinessSeries && (
        <SectionCard title="Readiness · 30 days">
          <ReadinessSection data={readinessSeries} />
        </SectionCard>
      )}

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

      {data.wellness.length > 0 && (
        <SectionCard title="Wellness">
          <WellnessSection data={data.wellness} />
        </SectionCard>
      )}

      {correlations && (
        <SectionCard title="Patterns">
          <PatternsSection data={correlations} />
        </SectionCard>
      )}
    </div>
  );
}
