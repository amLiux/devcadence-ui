import { describe, it, expect } from "vitest";
import { countGraph, parseGraph, pruneDanglingEdges } from "./graph";

describe("parseGraph", () => {
  it("parses arrays", () => {
    expect(parseGraph('[{"id":"a"}]')).toEqual([{ id: "a" }]);
  });

  it("returns an empty list for missing, invalid or non-array values", () => {
    expect(parseGraph(null)).toEqual([]);
    expect(parseGraph(undefined)).toEqual([]);
    expect(parseGraph("")).toEqual([]);
    expect(parseGraph("not json")).toEqual([]);
    expect(parseGraph('{"id":"a"}')).toEqual([]);
  });
});

describe("countGraph", () => {
  const base = {
    nodes: JSON.stringify([{ id: "a" }, { id: "b" }]),
    edges: JSON.stringify([{ id: "e1" }]),
  };

  it("counts nodes and edges", () => {
    expect(countGraph(base)).toEqual({ nodeCount: 2, edgeCount: 1 });
  });

  it("returns zero for missing or invalid payloads", () => {
    expect(countGraph({})).toEqual({ nodeCount: 0, edgeCount: 0 });
    expect(countGraph({ nodes: null, edges: "" })).toEqual({ nodeCount: 0, edgeCount: 0 });
    expect(countGraph({ nodes: "not json" })).toEqual({ nodeCount: 0, edgeCount: 0 });
    expect(countGraph({ nodes: '{"not":"an array"}' })).toEqual({ nodeCount: 0, edgeCount: 0 });
  });
});

describe("pruneDanglingEdges", () => {
  const nodes = [{ id: "a" }, { id: "b" }];

  it("keeps edges whose endpoints both exist", () => {
    const edges = [{ id: "e1", source: "a", target: "b" }];
    expect(pruneDanglingEdges(nodes, edges)).toEqual(edges);
  });

  it("drops edges pointing at deleted nodes", () => {
    const edges = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "a", target: "gone" },
      { id: "e3", source: "gone", target: "b" },
    ];
    expect(pruneDanglingEdges(nodes, edges).map((e) => e.id)).toEqual(["e1"]);
  });

  it("drops edges without endpoints", () => {
    const edges = [
      { id: "e1", source: undefined, target: "b" },
      { id: "e2", source: "a", target: null },
    ];
    expect(pruneDanglingEdges(nodes, edges)).toEqual([]);
  });

  it("returns an empty list for no edges", () => {
    expect(pruneDanglingEdges(nodes, [])).toEqual([]);
  });
});
