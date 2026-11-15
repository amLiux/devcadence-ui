import { describe, expect, it } from "vitest";
import { DEFAULT_MIME_TYPE, canConvertToGoogleDoc, resolveMimeType } from "./mime-types";

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

describe("canConvertToGoogleDoc", () => {
  it("allows plain text, auto and markdown", () => {
    expect(canConvertToGoogleDoc(undefined)).toBe(true);
    expect(canConvertToGoogleDoc("text/plain")).toBe(true);
    expect(canConvertToGoogleDoc("text/markdown")).toBe(true);
  });

  it("rejects formats that would need another Google type", () => {
    expect(canConvertToGoogleDoc("text/csv")).toBe(false);
    expect(canConvertToGoogleDoc("application/json")).toBe(false);
    expect(canConvertToGoogleDoc("text/html")).toBe(false);
  });
});
