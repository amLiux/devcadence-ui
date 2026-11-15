import { describe, expect, it } from "vitest";
import { parseRows } from "./google-sheets";

describe("parseRows", () => {
  it("parses an array of rows", () => {
    expect(parseRows('[["a","b"],[1,2]]')).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("wraps a single row", () => {
    expect(parseRows('["a",1]')).toEqual([["a", "1"]]);
  });

  it("returns an empty array for []", () => {
    expect(parseRows("[]")).toEqual([]);
  });

  it("rejects invalid JSON and non-arrays", () => {
    expect(parseRows("not json")).toBeNull();
    expect(parseRows('{"a":1}')).toBeNull();
    expect(parseRows("   ")).toBeNull();
  });
});
