export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function offsetDateStr(n: number, base = new Date()): string {
  return toDateStr(addDays(base, n));
}

export function mondayOf(base: Date): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Deterministic PRNG so a given session's demo data has stable-feeling jitter
// (not identical each reload — seeded from the load time — but not chaotic either).
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function jitter(rand: () => number, spread: number): number {
  return (rand() * 2 - 1) * spread;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
}

export function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `demo-${prefix}-${idCounter}`;
}

export function isoAt(dateStr: string, hour: number, minute = 0): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
