import { describe, expect, it } from "vitest";
import type { EditorNode } from "@/lib/types";
import { injectInput } from "./inject-input";

function inputNode(metadata: Record<string, string>): EditorNode {
  return {
    id: "input-1",
    type: "cardNode",
    position: { x: 0, y: 0 },
    data: {
      title: "Input",
      description: "",
      completed: false,
      current: false,
      type: "Action",
      metadata,
    },
  } as EditorNode;
}

describe("injectInput", () => {
  const metadata = {
    inputName_1: "message",
    inputName_2: "details",
    inputName_3: "slackChannelName",
    inputName_4: "discordChannelId",
  };

  it("maps by name regardless of the object key order", () => {
    const nodes = [inputNode({ ...metadata })];

    injectInput(nodes, {
      message: "found 0",
      slackChannelName: "#scans",
      discordChannelId: "123456789012345678",
      details: "at 12:45",
    });

    expect(nodes[0].data.metadata).toMatchObject({
      input_1: "found 0",
      input_2: "at 12:45",
      input_3: "#scans",
      input_4: "123456789012345678",
    });
  });

  it("ignores keys the child does not declare", () => {
    const nodes = [inputNode({ ...metadata })];

    injectInput(nodes, { message: "hi", unknown: "nope" });

    expect(nodes[0].data.metadata).toMatchObject({ input_1: "hi" });
    expect(nodes[0].data.metadata).not.toHaveProperty("input_2");
  });

  it("serializes non-string values", () => {
    const nodes = [inputNode({ ...metadata })];

    injectInput(nodes, { message: { total: 0 } });

    expect(nodes[0].data.metadata?.input_1).toBe('{"total":0}');
  });

  it("falls back to positional mapping when the child has no names", () => {
    const nodes = [inputNode({})];

    injectInput(nodes, { first: "a", second: "b" });

    expect(nodes[0].data.metadata).toMatchObject({ input_1: "a", input_2: "b" });
  });

  it("does nothing when the workflow has no Input node", () => {
    const nodes: EditorNode[] = [];
    expect(() => injectInput(nodes, { a: "1" })).not.toThrow();
  });
});
