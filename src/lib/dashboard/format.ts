import { DASHBOARD_RANGES, type DashboardRange } from "./types";

const RANGE_MS: Record<DashboardRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function parseDashboardRange(value: string | null | undefined): DashboardRange {
  return DASHBOARD_RANGES.includes(value as DashboardRange) ? (value as DashboardRange) : "7d";
}

export interface RangeWindow {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

/**
 * Current window plus the immediately preceding window of the same length, so
 * every KPI can be compared with the period before it.
 */
export function rangeWindow(range: DashboardRange, now: Date = new Date()): RangeWindow {
  const to = now;
  const from = new Date(now.getTime() - RANGE_MS[range]);
  const previousTo = from;
  const previousFrom = new Date(from.getTime() - RANGE_MS[range]);

  return { from, to, previousFrom, previousTo };
}

/** Nearest-rank percentile. Returns null for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

export function successRate(success: number, finished: number): number | null {
  if (finished <= 0) return null;
  return (success / finished) * 100;
}

/** Percentage change between two values. Null when the baseline is zero. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Floors a timestamp to the start of its bucket (hour for 24h, day otherwise). */
export function bucketStart(date: Date, range: DashboardRange): Date {
  const bucket = new Date(date);

  if (range === "24h") {
    bucket.setUTCMinutes(0, 0, 0);
  } else {
    bucket.setUTCHours(0, 0, 0, 0);
  }

  return bucket;
}

/** Every bucket start between two instants, used to render empty periods. */
export function bucketStarts(from: Date, to: Date, range: DashboardRange): Date[] {
  const step = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const starts: Date[] = [];

  for (let time = bucketStart(from, range).getTime(); time < to.getTime(); time += step) {
    starts.push(new Date(time));
  }

  return starts;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

export interface DeltaLabel {
  label: string;
  direction: "up" | "down" | "flat";
}

export function formatDelta(value: number | null, unit: "pct" | "pp" = "pct"): DeltaLabel {
  if (value === null || Number.isNaN(value)) return { label: "no baseline", direction: "flat" };

  if (Math.abs(value) < 0.05) return { label: "flat", direction: "flat" };

  const magnitude = Math.abs(value);
  const rounded = magnitude >= 10 ? magnitude.toFixed(0) : magnitude.toFixed(1);
  const suffix = unit === "pp" ? " pp" : "%";
  return {
    label: `${value > 0 ? "+" : "-"}${rounded}${suffix}`,
    direction: value > 0 ? "up" : "down",
  };
}

/** Short label for a volume bucket, in UTC to match how the server groups them. */
export function formatBucketLabel(bucket: string, range: DashboardRange): string {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;

  if (range === "24h") {
    return `${String(date.getUTCHours()).padStart(2, "0")}:00`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Compact relative time for run timestamps. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();
}
