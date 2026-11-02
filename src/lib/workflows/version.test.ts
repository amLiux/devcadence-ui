import { describe, it, expect } from "vitest";
import {
  buildSnapshot,
  countGraph,
  MAX_VERSIONS,
  shouldCreateVersion,
  snapshotHash,
  type WorkflowSnapshot,
} from "./version";

const base: WorkflowSnapshot = {
  name: "Deploy alerts",
  description: "Notify on deploy failures",
  type: "workflow",
  nodes: JSON.stringify([{ id: "a" }, { id: "b" }]),
  edges: JSON.stringify([{ id: "e1", source: "a", target: "b" }]),
  status: "draft",
};

describe("buildSnapshot", () => {
  it("keeps the restorable fields", () => {
    expect(buildSnapshot(base)).toEqual(base);
  });

  it("defaults missing optional fields", () => {
    expect(
      buildSnapshot({
        name: "x",
        description: undefined as unknown as string,
        type: undefined as unknown as string,
        nodes: undefined as unknown as string,
        edges: undefined as unknown as string,
        status: undefined as unknown as string,
      }),
    ).toEqual({
      name: "x",
      description: "",
      type: "workflow",
      nodes: null,
      edges: null,
      status: "draft",
    });
  });
});

describe("snapshotHash", () => {
  it("is stable for identical content", () => {
    expect(snapshotHash(base)).toBe(snapshotHash({ ...base }));
  });

  it("is independent of how the object was built", () => {
    const reordered: WorkflowSnapshot = {
      status: base.status,
      edges: base.edges,
      nodes: base.nodes,
      type: base.type,
      description: base.description,
      name: base.name,
    };
    expect(snapshotHash(reordered)).toBe(snapshotHash(base));
  });

  it("changes when any field changes", () => {
    const hash = snapshotHash(base);

    expect(snapshotHash({ ...base, name: "Other" })).not.toBe(hash);
    expect(snapshotHash({ ...base, description: "Other" })).not.toBe(hash);
    expect(snapshotHash({ ...base, type: "sub-workflow" })).not.toBe(hash);
    expect(snapshotHash({ ...base, nodes: "[]" })).not.toBe(hash);
    expect(snapshotHash({ ...base, edges: "[]" })).not.toBe(hash);
    expect(snapshotHash({ ...base, status: "active" })).not.toBe(hash);
  });

  it("treats null and empty graphs the same way", () => {
    expect(snapshotHash({ ...base, nodes: null })).toBe(snapshotHash({ ...base, nodes: null }));
    expect(snapshotHash({ ...base, nodes: null })).not.toBe(
      snapshotHash({ ...base, nodes: "[]" }),
    );
  });
});

describe("shouldCreateVersion", () => {
  it("skips a save that changes nothing", () => {
    expect(shouldCreateVersion(base, { ...base }, null)).toBe(false);
  });

  it("creates a version when there is nothing stored yet", () => {
    expect(shouldCreateVersion(base, { ...base, name: "Renamed" }, null)).toBe(true);
    expect(shouldCreateVersion(base, { ...base, name: "Renamed" }, undefined)).toBe(true);
  });

  it("creates a version when the content changed", () => {
    expect(shouldCreateVersion(base, { ...base, name: "Renamed" }, "some-other-hash")).toBe(true);
  });

  it("skips a state that is already the newest stored version", () => {
    expect(shouldCreateVersion(base, { ...base, name: "Renamed" }, snapshotHash(base))).toBe(false);
  });
});

describe("countGraph", () => {
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

describe("retention", () => {
  it("keeps the last 25 versions", () => {
    expect(MAX_VERSIONS).toBe(25);
  });
});
