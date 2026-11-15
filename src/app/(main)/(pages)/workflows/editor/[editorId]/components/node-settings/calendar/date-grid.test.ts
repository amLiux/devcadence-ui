import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  combine,
  formatDisplay,
  monthLabel,
  parseLocalValue,
  toMonthKey,
} from "./date-grid";

describe("parseLocalValue / combine", () => {
  it("parses picker values", () => {
    expect(parseLocalValue("2026-11-20T10:30")).toEqual({ date: "2026-11-20", time: "10:30" });
  });

  it("parses full ISO values and keeps the wall time", () => {
    expect(parseLocalValue("2026-11-20T10:30:00-06:00")).toEqual({
      date: "2026-11-20",
      time: "10:30",
    });
  });

  it("returns empty parts for expressions", () => {
    expect(parseLocalValue("{{previousStep.start}}")).toEqual({ date: "", time: "" });
  });

  it("combines date and time with a default", () => {
    expect(combine("2026-11-20", "10:30")).toBe("2026-11-20T10:30");
    expect(combine("2026-11-20", "")).toBe("2026-11-20T09:00");
    expect(combine("", "10:30")).toBe("");
  });
});

describe("buildMonthGrid", () => {
  it("returns six weeks starting on Monday", () => {
    const grid = buildMonthGrid(2026, 10, "2026-11-15"); // November 2026
    expect(grid).toHaveLength(42);
    expect(grid[0].iso).toBe("2026-10-26");
    expect(grid[41].iso).toBe("2026-12-06");
  });

  it("marks days of the month and today", () => {
    const grid = buildMonthGrid(2026, 10, "2026-11-15");
    const today = grid.find((cell) => cell.iso === "2026-11-15");
    expect(today?.isToday).toBe(true);
    expect(today?.inMonth).toBe(true);

    const outside = grid.find((cell) => cell.iso === "2026-10-26");
    expect(outside?.inMonth).toBe(false);
  });
});

describe("monthLabel / addMonths / toMonthKey", () => {
  it("formats the month", () => {
    expect(monthLabel(2026, 10)).toMatch(/2026/);
  });

  it("moves across year boundaries", () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("derives the visible month from the value", () => {
    expect(toMonthKey("2026-11-20T10:30")).toEqual({ year: 2026, month: 10 });
  });
});

describe("formatDisplay", () => {
  it("returns a readable value and tolerates junk", () => {
    expect(formatDisplay("2026-11-20T10:30")).toMatch(/2026/);
    expect(formatDisplay("{{x}}")).toBe("");
  });
});
