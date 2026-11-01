import { describe, it, expect } from "vitest";
import {
  DEFAULT_CACHE_TTL_SECONDS,
  MAX_CACHE_TTL_SECONDS,
  MIN_CACHE_TTL_SECONDS,
  isCacheEnabled,
  resolveCacheTtl,
} from "./http-cache";

describe("isCacheEnabled", () => {
  it("only enables caching for the literal string true", () => {
    expect(isCacheEnabled({ cacheEnabled: "true" })).toBe(true);
    expect(isCacheEnabled({ cacheEnabled: "false" })).toBe(false);
    expect(isCacheEnabled({ cacheEnabled: "1" })).toBe(false);
    expect(isCacheEnabled({})).toBe(false);
  });
});

describe("resolveCacheTtl", () => {
  it("falls back to the default when unset or invalid", () => {
    expect(resolveCacheTtl(undefined)).toBe(DEFAULT_CACHE_TTL_SECONDS);
    expect(resolveCacheTtl("")).toBe(DEFAULT_CACHE_TTL_SECONDS);
    expect(resolveCacheTtl("abc")).toBe(DEFAULT_CACHE_TTL_SECONDS);
  });

  it("accepts a value inside the range", () => {
    expect(resolveCacheTtl("45")).toBe(45);
  });

  it("clamps values below the minimum", () => {
    expect(resolveCacheTtl("0")).toBe(MIN_CACHE_TTL_SECONDS);
    expect(resolveCacheTtl("-120")).toBe(MIN_CACHE_TTL_SECONDS);
  });

  it("clamps values above the maximum", () => {
    expect(resolveCacheTtl("999999")).toBe(MAX_CACHE_TTL_SECONDS);
  });

  it("truncates decimals to an integer", () => {
    expect(resolveCacheTtl("12.9")).toBe(12);
  });
});
