import { describe, expect, it } from "vitest";
import { COMMON_TIMEZONES, defaultTimezone, getTimezones } from "./timezones";

describe("timezones", () => {
  it("returns a non-empty list with UTC", () => {
    const zones = getTimezones();
    expect(zones.length).toBeGreaterThan(10);
    expect(zones).toContain("UTC");
  });

  it("includes the common zones", () => {
    const zones = getTimezones();
    for (const zone of COMMON_TIMEZONES) {
      expect(zones).toContain(zone);
    }
  });

  it("caches the list", () => {
    expect(getTimezones()).toBe(getTimezones());
  });

  it("returns a valid default zone", () => {
    expect(typeof defaultTimezone()).toBe("string");
    expect(defaultTimezone().length).toBeGreaterThan(0);
  });
});
