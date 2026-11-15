/** Pure date math for the picker. No dependencies: everything is UTC-based calendar math. */

export interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Accepts "YYYY-MM-DD", "YYYY-MM-DDTHH:mm" and full ISO strings with offset. */
export function parseLocalValue(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value);
  if (!match) return { date: "", time: "" };
  return { date: match[1], time: match[2] ?? "" };
}

export function combine(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "09:00"}`;
}

export function toMonthKey(value: string): { year: number; month: number } {
  const { date } = parseLocalValue(value);
  if (date) {
    const [year, month] = date.split("-").map(Number);
    return { year, month: month - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Six weeks starting on Monday, so the grid height never jumps between months. */
export function buildMonthGrid(year: number, month: number, today = todayIso()): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    const iso = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    return {
      iso,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month && date.getUTCFullYear() === year,
      isToday: iso === today,
    };
  });
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
}

export function formatDisplay(value: string): string {
  const { date, time } = parseLocalValue(value);
  if (!date) return "";
  const parsed = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" } : {}),
  }).format(parsed);
}
