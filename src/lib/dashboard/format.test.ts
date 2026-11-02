import { describe, it, expect } from "vitest";
import {
  bucketStart,
  bucketStarts,
  deltaPct,
  formatBucketLabel,
  formatDelta,
  formatDuration,
  formatPercent,
  formatRelativeTime,
  formatTokens,
  parseDashboardRange,
  percentile,
  rangeWindow,
  successRate,
} from "./format";

const NOW = new Date("2026-11-02T12:34:56.000Z");

describe("parseDashboardRange", () => {
  it("accepts the supported ranges", () => {
    expect(parseDashboardRange("24h")).toBe("24h");
    expect(parseDashboardRange("7d")).toBe("7d");
    expect(parseDashboardRange("30d")).toBe("30d");
  });

  it("falls back to 7d for anything else", () => {
    expect(parseDashboardRange(null)).toBe("7d");
    expect(parseDashboardRange("90d")).toBe("7d");
  });
});

describe("rangeWindow", () => {
  it("places the previous window immediately before the current one", () => {
    const window = rangeWindow("7d", NOW);

    expect(window.to).toEqual(NOW);
    expect(window.from).toEqual(new Date("2026-10-26T12:34:56.000Z"));
    expect(window.previousTo).toEqual(window.from);
    expect(window.previousFrom).toEqual(new Date("2026-10-19T12:34:56.000Z"));
  });

  it("uses the range length for each window", () => {
    const day = rangeWindow("24h", NOW);
    expect(NOW.getTime() - day.from.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(day.from.getTime() - day.previousFrom.getTime()).toBe(24 * 60 * 60 * 1000);

    const month = rangeWindow("30d", NOW);
    expect(NOW.getTime() - month.from.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("percentile", () => {
  it("returns null for an empty list", () => {
    expect(percentile([], 0.95)).toBeNull();
  });

  it("returns the only value for a single sample", () => {
    expect(percentile([42], 0.95)).toBe(42);
  });

  it("uses nearest rank", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([1, 2, 3, 4], 0.95)).toBe(4);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
  });

  it("does not mutate the input", () => {
    const values = [3, 1, 2];
    percentile(values, 0.5);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe("successRate and deltaPct", () => {
  it("computes the success percentage", () => {
    expect(successRate(3, 4)).toBe(75);
  });

  it("returns null when nothing finished", () => {
    expect(successRate(0, 0)).toBeNull();
  });

  it("computes percentage change", () => {
    expect(deltaPct(15, 10)).toBe(50);
    expect(deltaPct(5, 10)).toBe(-50);
    expect(deltaPct(0, 0)).toBeNull();
  });
});

describe("bucketing", () => {
  it("floors to the hour for 24h and to the day otherwise", () => {
    const date = new Date("2026-11-02T12:34:56.000Z");
    expect(bucketStart(date, "24h")).toEqual(new Date("2026-11-02T12:00:00.000Z"));
    expect(bucketStart(date, "7d")).toEqual(new Date("2026-11-02T00:00:00.000Z"));
    expect(bucketStart(date, "30d")).toEqual(new Date("2026-11-02T00:00:00.000Z"));
  });

  it("builds one bucket per hour or per day", () => {
    const from = new Date("2026-11-01T00:00:00.000Z");

    expect(bucketStarts(from, new Date("2026-11-02T00:00:00.000Z"), "24h")).toHaveLength(24);
    expect(bucketStarts(from, new Date("2026-11-08T00:00:00.000Z"), "7d")).toHaveLength(7);
  });

  it("returns no buckets for an inverted window", () => {
    expect(bucketStarts(new Date("2026-11-02T00:00:00.000Z"), new Date("2026-11-01T00:00:00.000Z"), "7d")).toEqual([]);
  });
});

describe("display formatters", () => {
  it("formats durations", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(1500)).toBe("1.5 s");
    expect(formatDuration(125_000)).toBe("2m 5s");
  });

  it("formats tokens and counts", () => {
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(2_300_000)).toBe("2.3M");
  });

  it("formats percentages", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(94.25)).toBe("94.3%");
  });

  it("formats deltas", () => {
    expect(formatDelta(null)).toEqual({ label: "no baseline", direction: "flat" });
    expect(formatDelta(0)).toEqual({ label: "flat", direction: "flat" });
    expect(formatDelta(12.34)).toEqual({ label: "+12%", direction: "up" });
    expect(formatDelta(3.44)).toEqual({ label: "+3.4%", direction: "up" });
    expect(formatDelta(-3.2, "pp")).toEqual({ label: "-3.2 pp", direction: "down" });
  });

  it("labels buckets", () => {
    expect(formatBucketLabel("2026-11-02T09:00:00.000Z", "24h")).toBe("09:00");
    expect(formatBucketLabel("2026-11-02T00:00:00.000Z", "7d")).toBe("Nov 2");
  });

  it("formats relative times", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 20_000).toISOString(), NOW.getTime())).toBe("just now");
    expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW.getTime())).toBe("5m ago");
    expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 3_600_000).toISOString(), NOW.getTime())).toBe("3h ago");
    expect(formatRelativeTime("nope", NOW.getTime())).toBe("");
  });
});
