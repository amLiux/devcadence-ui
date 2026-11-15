import { describe, expect, it } from "vitest";
import { DEFAULT_MIME_TYPE, resolveMimeType } from "./mime-types";

describe("resolveMimeType", () => {
  it("defaults to plain text when empty", () => {
    expect(resolveMimeType(undefined)).toBe(DEFAULT_MIME_TYPE);
    expect(resolveMimeType("")).toBe(DEFAULT_MIME_TYPE);
  });

  it("keeps a supported type", () => {
    expect(resolveMimeType("text/csv")).toBe("text/csv");
    expect(resolveMimeType("application/json")).toBe("application/json");
  });

  it("falls back for unsupported types", () => {
    expect(resolveMimeType("application/pdf")).toBe(DEFAULT_MIME_TYPE);
  });
});
