import { describe, it, expect } from "vitest";
import { diffWorkflows } from "./diff";

function node(id: string, title: string, metadata: Record<string, unknown> = {}, type = "Action") {
  return { id, type, position: { x: 0, y: 0 }, data: { title, type, metadata } };
}

function edge(id: string, source: string, target: string) {
  return { id, source, target, sourceHandle: null };
}

function snapshot(nodes: unknown[], edges: unknown[] = []) {
  return { nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) };
}

describe("diffWorkflows — nodes", () => {
  it("reports added and removed nodes", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "Webhook"), node("b", "Slack")]),
      snapshot([node("a", "Webhook"), node("c", "Conditional")]),
    );

    expect(diff.nodes.added.map((n) => n.title)).toEqual(["Conditional"]);
    expect(diff.nodes.removed.map((n) => n.title)).toEqual(["Slack"]);
    expect(diff.nodes.changed).toEqual([]);
    expect(diff.summary).toMatchObject({ nodesAdded: 1, nodesRemoved: 1, nodesChanged: 0 });
    expect(diff.hasChanges).toBe(true);
  });

  it("lists the metadata keys that differ", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "Send Slack Message", { channel: "#general", text: "hi" })]),
      snapshot([node("a", "Send Slack Message", { channel: "#alerts", text: "hi" })]),
    );

    expect(diff.nodes.changed).toHaveLength(1);
    expect(diff.nodes.changed[0].fields).toEqual([
      { key: "channel", before: "#general", after: "#alerts" },
    ]);
  });

  it("reports added and removed metadata keys", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "HTTP Request", { url: "https://x", method: "GET" })]),
      snapshot([node("a", "HTTP Request", { url: "https://x" })]),
    );

    expect(diff.nodes.changed[0].fields).toEqual([
      { key: "method", before: "GET", after: null },
    ]);
  });

  it("detects title and type changes", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "Prompt", { prompt: "x" }, "AI")]),
      snapshot([node("a", "Classify", { prompt: "x" }, "AI")]),
    );

    expect(diff.nodes.changed[0].title).toBe("Classify");
    expect(diff.nodes.changed[0].fields).toEqual([
      { key: "title", before: "Prompt", after: "Classify" },
    ]);
  });

  it("ignores node position", () => {
    const before = node("a", "Webhook");
    const after = { ...node("a", "Webhook"), position: { x: 400, y: 300 } };

    const diff = diffWorkflows(snapshot([before]), snapshot([after]));

    expect(diff.nodes.changed).toEqual([]);
    expect(diff.hasChanges).toBe(false);
  });

  it("treats blank and missing metadata as equal", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "HTTP Request", { method: "" })]),
      snapshot([node("a", "HTTP Request", {})]),
    );

    expect(diff.nodes.changed).toEqual([]);
  });

  it("sorts changed fields by key", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "Node", { zeta: "1", alpha: "1" })]),
      snapshot([node("a", "Node", { zeta: "2", alpha: "2" })]),
    );

    expect(diff.nodes.changed[0].fields.map((f) => f.key)).toEqual(["alpha", "zeta"]);
  });
});

describe("diffWorkflows — edges", () => {
  it("reports added and removed edges", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "A"), node("b", "B")], [edge("e1", "a", "b")]),
      snapshot([node("a", "A"), node("b", "B")], [edge("e2", "b", "a")]),
    );

    expect(diff.edges.added.map((e) => e.label)).toEqual(["b → a"]);
    expect(diff.edges.removed.map((e) => e.label)).toEqual(["a → b"]);
    expect(diff.summary).toMatchObject({ edgesAdded: 1, edgesRemoved: 1 });
  });

  it("reports reconnected edges as changed", () => {
    const diff = diffWorkflows(
      snapshot([], [edge("e1", "a", "b")]),
      snapshot([], [edge("e1", "a", "c")]),
    );

    expect(diff.edges.changed).toHaveLength(1);
    expect(diff.edges.changed[0].fields).toEqual([
      { key: "target", before: "b", after: "c" },
    ]);
  });
});

describe("diffWorkflows — edge cases", () => {
  it("reports no changes for identical snapshots", () => {
    const graph = snapshot([node("a", "Webhook")], [edge("e1", "a", "a")]);

    const diff = diffWorkflows(graph, { ...graph });

    expect(diff.hasChanges).toBe(false);
    expect(diff.nodes).toEqual({ added: [], removed: [], changed: [] });
    expect(diff.edges).toEqual({ added: [], removed: [], changed: [] });
  });

  it("does not crash on missing or invalid payloads", () => {
    expect(diffWorkflows({}, {}).hasChanges).toBe(false);
    expect(diffWorkflows({ nodes: "nope", edges: "nope" }, {}).hasChanges).toBe(false);
    expect(diffWorkflows({}, snapshot([node("a", "Webhook")])).summary.nodesAdded).toBe(1);
  });

  it("serializes non-string metadata values", () => {
    const diff = diffWorkflows(
      snapshot([node("a", "Build JSON", { mapKey_1: "total" })]),
      snapshot([node("a", "Build JSON", { mapKey_1: "count" })]),
    );

    expect(diff.nodes.changed[0].fields).toEqual([
      { key: "mapKey_1", before: "total", after: "count" },
    ]);
  });
});
