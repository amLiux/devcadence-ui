import { describe, it, expect } from "vitest";
import {
  buildParentMap,
  buildForwardMap,
  buildAncestorChain,
  outputsFromContext,
  evaluateExpression,
  resolveTemplateVariables,
  resolveTemplates,
  wrapTransformOutput,
  resolveExpressionInput,
  findRoots,
  type NodeOutput,
} from "./workflow-context";
import type { ContextStep, EditorEdge, EditorNode, WorkflowContext } from "./types";

function node(id: string, title: string, metadata: Record<string, unknown> = {}): EditorNode {
  return {
    id,
    type: "cardNode",
    position: { x: 0, y: 0 },
    data: {
      title,
      description: "",
      completed: false,
      current: false,
      metadata,
      type: "Action",
    },
  };
}

function edge(id: string, source: string, target: string, sourceHandle?: string): EditorEdge {
  return { id, source, target, sourceHandle };
}

describe("buildParentMap", () => {
  it("maps each target to its source nodes", () => {
    const parents = buildParentMap([
      edge("e1", "a", "b"),
      edge("e2", "c", "b"),
      edge("e3", "b", "d"),
    ]);

    expect(parents.get("b")).toEqual(["a", "c"]);
    expect(parents.get("d")).toEqual(["b"]);
    expect(parents.has("a")).toBe(false);
  });

  it("returns an empty map for no edges", () => {
    expect(buildParentMap([]).size).toBe(0);
  });
});

describe("buildForwardMap", () => {
  it("maps each source to its targets with handles", () => {
    const forward = buildForwardMap([
      edge("e1", "cond", "yes", "success"),
      edge("e2", "cond", "no", "failure"),
    ]);

    expect(forward.get("cond")).toEqual([
      { targetId: "yes", sourceHandle: "success" },
      { targetId: "no", sourceHandle: "failure" },
    ]);
  });

  it("normalizes a missing handle to null", () => {
    const forward = buildForwardMap([edge("e1", "a", "b")]);
    expect(forward.get("a")?.[0].sourceHandle).toBeNull();
  });
});

describe("outputsFromContext", () => {
  it("converts a flat workflow context into a node output map", () => {
    const context: WorkflowContext = {
      "node-1": { name: "HTTP", output: { status: 200 }, success: true, error: null },
      "node-2": { name: "Transform", output: null, success: false, error: "boom" },
    };

    const outputs = outputsFromContext(context);

    expect(outputs.get("node-1")).toEqual({ data: { status: 200 }, success: true, error: null });
    expect(outputs.get("node-2")).toEqual({ data: null, success: false, error: "boom" });
  });
});

describe("buildAncestorChain", () => {
  const nodes = [node("a", "Trigger"), node("b", "HTTP Request", { outputName: "fetch" }), node("c", "Transform")];
  const parents = buildParentMap([edge("e1", "a", "b"), edge("e2", "b", "c")]);
  const outputs = new Map<string, NodeOutput>([
    ["a", { data: { start: true }, success: true, error: null }],
    ["b", { data: { fetch: { status: 200 } }, success: true, error: null }],
  ]);

  it("walks parents backwards into a linked list", () => {
    const chain = buildAncestorChain("c", parents, outputs, nodes);

    expect(chain).toBeDefined();
    expect(chain?.name).toBe("HTTP Request");
    expect(chain?.outputName).toBe("fetch");
    expect(chain?.previousStep?.name).toBe("Trigger");
    expect(chain?.previousStep?.previousStep).toBeUndefined();
  });

  it("returns undefined for a root node", () => {
    expect(buildAncestorChain("a", parents, outputs, nodes)).toBeUndefined();
  });

  it("skips parents without output and uses the next one", () => {
    const branchParents = buildParentMap([edge("e1", "x", "z"), edge("e2", "y", "z")]);
    const branchOutputs = new Map<string, NodeOutput>([
      ["y", { data: "from-y", success: true, error: null }],
    ]);
    const chain = buildAncestorChain(
      "z",
      branchParents,
      branchOutputs,
      [node("x", "X"), node("y", "Y"), node("z", "Z")],
    );

    expect(chain?.name).toBe("Y");
    expect(chain?.output).toBe("from-y");
  });
});

describe("evaluateExpression", () => {
  it("evaluates a simple expression", () => {
    expect(evaluateExpression("1 + 1", {})).toBe(2);
  });

  it("destructures object input keys as top-level variables", () => {
    expect(evaluateExpression("previousStep.status === 200", { previousStep: { status: 200 } })).toBe(true);
  });

  it("exposes non-object input as previousStep", () => {
    expect(evaluateExpression("previousStep.length", "abc")).toBe(3);
  });

  it("throws on invalid expressions", () => {
    expect(() => evaluateExpression("this is not js", {})).toThrow();
  });
});

describe("resolveTemplateVariables", () => {
  it("returns the input unchanged when there are no templates", () => {
    expect(resolveTemplateVariables("plain text", {})).toBe("plain text");
  });

  it("resolves nested expressions", () => {
    expect(resolveTemplateVariables("Hello {{previousStep.name}}", { previousStep: { name: "World" } })).toBe(
      "Hello World",
    );
  });

  it("renders null and undefined as empty strings", () => {
    expect(resolveTemplateVariables("[{{previousStep.missing}}]", { previousStep: {} })).toBe("[]");
  });

  it("keeps the placeholder when the expression is invalid", () => {
    expect(resolveTemplateVariables("{{nope()}}", {})).toBe("{{nope()}}");
  });
});

describe("resolveTemplates", () => {
  it("resolves against the ancestor chain's immediate parent output", () => {
    const chain: ContextStep = {
      name: "HTTP Request",
      output: { status: 200, body: { ok: true } },
      success: true,
      error: null,
    };

    expect(resolveTemplates("{{previousStep.status}}", chain)).toBe("200");
  });

  it("falls back to the provided body when there is no chain", () => {
    expect(resolveTemplates("{{previousStep.value}}", undefined, { value: 42 })).toBe("42");
  });

  it("exposes named ancestor outputs at the top level", () => {
    const chain: ContextStep = {
      name: "Transform",
      outputName: "total",
      output: { total: 99 },
      success: true,
      error: null,
    };

    expect(resolveTemplates("{{total}}", chain)).toBe("99");
  });
});

describe("wrapTransformOutput", () => {
  it("wraps the result under the output name", () => {
    expect(wrapTransformOutput("total", 42)).toEqual({ total: 42 });
  });

  it("returns the raw result when no output name is set", () => {
    expect(wrapTransformOutput(undefined, 42)).toBe(42);
    expect(wrapTransformOutput("   ", 42)).toBe(42);
  });
});

describe("resolveExpressionInput", () => {
  it("parses the fallback body when there is no ancestor chain", () => {
    expect(resolveExpressionInput({ body: '{"a":1}' }, undefined)).toEqual({ previousStep: { a: 1 } });
  });

  it("defaults to an empty previousStep when there is no body", () => {
    expect(resolveExpressionInput({}, undefined)).toEqual({ previousStep: {} });
  });

  it("builds previousStep from the chain and keeps named outputs flat", () => {
    const chain: ContextStep = {
      name: "Transform",
      outputName: "count",
      output: { count: 3 },
      success: true,
      error: null,
      previousStep: {
        name: "Trigger",
        output: { event: "push" },
        success: true,
        error: null,
      },
    };

    const input = resolveExpressionInput({}, chain);

    expect(input.count).toBe(3);
    expect(input.previousStep.count).toBe(3);
    expect(input.previousStep.previousStep).toEqual({ event: "push" });
  });
});

describe("findRoots", () => {
  it("returns nodes without incoming edges", () => {
    const nodes = [node("a", "A"), node("b", "B"), node("c", "C")];
    const roots = findRoots(nodes, [edge("e1", "a", "b"), edge("e2", "b", "c")]);

    expect(roots.map((n) => n.id)).toEqual(["a"]);
  });

  it("returns every node when there are no edges", () => {
    const nodes = [node("a", "A"), node("b", "B")];
    expect(findRoots(nodes, [])).toHaveLength(2);
  });
});
