import { describe, it, expect } from "vitest";
import { resolveNextNodeIds, type RoutingChild } from "./routing";

const nodeIds = new Set(["a", "b", "c", "deleted"]);

function child(targetId: string, sourceHandle: string | null = null): RoutingChild {
  return { targetId, sourceHandle };
}

describe("resolveNextNodeIds — non-conditional", () => {
  it("follows every child", () => {
    expect(
      resolveNextNodeIds("HTTP Request", null, [child("a"), child("b")], nodeIds),
    ).toEqual(["a", "b"]);
  });

  it("drops edges whose target no longer exists", () => {
    expect(
      resolveNextNodeIds("HTTP Request", null, [child("gone"), child("a")], nodeIds),
    ).toEqual(["a"]);
  });

  it("dedupes repeated targets", () => {
    expect(
      resolveNextNodeIds("HTTP Request", null, [child("a"), child("a")], nodeIds),
    ).toEqual(["a"]);
  });
});

describe("resolveNextNodeIds — Conditional", () => {
  it("follows only the success handle when the condition is true", () => {
    const children = [child("a", "success"), child("b", "failure")];

    expect(resolveNextNodeIds("Conditional", { condition: true }, children, nodeIds)).toEqual([
      "a",
    ]);
  });

  it("follows only the failure handle when the condition is false", () => {
    const children = [child("a", "success"), child("b", "failure")];

    expect(resolveNextNodeIds("Conditional", { condition: false }, children, nodeIds)).toEqual([
      "b",
    ]);
  });

  it("follows every edge on the chosen handle", () => {
    const children = [
      child("a", "failure"),
      child("b", "failure"),
      child("c", "success"),
    ];

    expect(resolveNextNodeIds("Conditional", { condition: false }, children, nodeIds)).toEqual([
      "a",
      "b",
    ]);
  });

  it("ignores a dangling edge before a valid one on the same handle", () => {
    const children = [
      child("gone", "failure"),
      child("b", "failure"),
    ];

    // Regression: the old code used children.find(), so "gone" consumed the branch.
    expect(resolveNextNodeIds("Conditional", { condition: false }, children, nodeIds)).toEqual([
      "b",
    ]);
  });

  it("returns nothing when the chosen handle has no edges", () => {
    expect(
      resolveNextNodeIds("Conditional", { condition: true }, [child("b", "failure")], nodeIds),
    ).toEqual([]);
  });

  it("returns nothing when the handler produced no condition", () => {
    expect(
      resolveNextNodeIds("Conditional", undefined, [child("a", "success")], nodeIds),
    ).toEqual([]);
    expect(
      resolveNextNodeIds("Conditional", { result: true }, [child("a", "success")], nodeIds),
    ).toEqual([]);
  });
});
