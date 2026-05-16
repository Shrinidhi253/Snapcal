// Utilities for the weekly calendar view.

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1 - day); // make Monday the start
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const m = (x: Date) => x.toLocaleString(undefined, { month: "short" });
  return sameMonth
    ? `${m(monday)} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`
    : `${m(monday)} ${monday.getDate()} – ${m(sunday)} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

// Deterministic color per subject key. Returns CSS classes.
const PALETTE = [
  "bg-[oklch(0.92_0.05_25)] text-[oklch(0.30_0.12_25)] border-[oklch(0.75_0.12_25)]",
  "bg-[oklch(0.92_0.05_140)] text-[oklch(0.30_0.12_140)] border-[oklch(0.75_0.12_140)]",
  "bg-[oklch(0.92_0.05_250)] text-[oklch(0.30_0.12_250)] border-[oklch(0.75_0.12_250)]",
  "bg-[oklch(0.92_0.05_60)] text-[oklch(0.30_0.12_60)] border-[oklch(0.75_0.12_60)]",
  "bg-[oklch(0.92_0.05_320)] text-[oklch(0.30_0.12_320)] border-[oklch(0.75_0.12_320)]",
  "bg-[oklch(0.92_0.05_190)] text-[oklch(0.30_0.12_190)] border-[oklch(0.75_0.12_190)]",
  "bg-[oklch(0.92_0.05_100)] text-[oklch(0.30_0.12_100)] border-[oklch(0.75_0.12_100)]",
  "bg-[oklch(0.92_0.05_290)] text-[oklch(0.30_0.12_290)] border-[oklch(0.75_0.12_290)]",
];

export function colorForSubject(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
