import { describe, it, expect, vi, beforeEach } from "vitest";
import { runGraph } from "./run-graph";
import type { EditorNode, EditorEdge } from "@/lib/types";

const mocks = vi.hoisted(() => ({ executeNode: vi.fn() }));

vi.mock("./execute-node", () => ({ executeNode: mocks.executeNode }));

function node(id: string): EditorNode {
  return {
    id,
    type: "cardNode",
    position: { x: 0, y: 0 },
    data: {
      title: id,
      description: "",
      type: "Action",
      completed: false,
      current: false,
      metadata: {},
    },
  };
}

const nodes = [node("a"), node("b"), node("c"), node("d")];

const edges: EditorEdge[] = [
  { id: "ab", source: "a", target: "b" },
  { id: "ac", source: "a", target: "c" },
  { id: "bd", source: "b", target: "d" },
  { id: "cd", source: "c", target: "d" },
];

function executedIds(): string[] {
  return mocks.executeNode.mock.calls.map((call) => (call[0] as EditorNode).id);
}

beforeEach(() => {
  mocks.executeNode.mockReset();
  mocks.executeNode.mockImplementation(async (executed: EditorNode) => ({
    debugLog: { nodeId: executed.id, title: executed.data.title, success: true, logs: [] },
    data: { id: executed.id },
  }));
});

describe("runGraph", () => {
  it("defers a node until all of its parents have run", async () => {
    const state = await runGraph({ nodes, edges, runId: "run-1" });

    expect(executedIds()).toEqual(["a", "b", "c", "d"]);
    expect(state.stepResults).toHaveLength(4);
    expect(state.nodeOutputs.get("d")?.data).toEqual({ id: "d" });
  });

  it("passes workflow variables to every node", async () => {
    await runGraph({
      nodes,
      edges,
      runId: "run-1",
      variables: { repo: "org/repo" },
    });

    expect(mocks.executeNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
      undefined,
      expect.objectContaining({ variables: { repo: "org/repo" } }),
    );
  });

  it("lets a seed callback handle a root and enqueue its children", async () => {
    const seed = vi.fn(({ root, queue }: { root: EditorNode; queue: string[] }) => {
      if (root.id === "a") {
        queue.push("b");
        return "seeded" as const;
      }
      return "queue" as const;
    });

    await runGraph({
      nodes: [node("a"), node("b")],
      edges: [],
      runId: "run-1",
      seed,
    });

    expect(executedIds()).toEqual(["b"]);
  });

  it("stops when the seed aborts", async () => {
    const state = await runGraph({
      nodes: [node("a")],
      edges: [],
      runId: "run-1",
      seed: () => "abort",
    });

    expect(executedIds()).toEqual([]);
    expect(state.stepResults).toHaveLength(0);
  });

  it("walks depth-first when requested", async () => {
    await runGraph({ nodes, edges, runId: "run-1", order: "dfs" });

    expect(executedIds()).toEqual(["a", "b", "d", "c"]);
  });
});
