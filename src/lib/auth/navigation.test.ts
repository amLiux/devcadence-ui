import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./navigation";

describe("safeReturnTo", () => {
  it("keeps local paths", () => {
    expect(safeReturnTo("/workflows")).toBe("/workflows");
    expect(safeReturnTo("/settings?tab=runs")).toBe("/settings?tab=runs");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeReturnTo("//evil.test")).toBe("/");
    expect(safeReturnTo("https://evil.test")).toBe("/");
    expect(safeReturnTo("javascript:alert(1)")).toBe("/");
    expect(safeReturnTo(null)).toBe("/");
  });
});
