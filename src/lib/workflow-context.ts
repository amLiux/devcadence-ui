import type { EditorNode, EditorEdge, WorkflowContext, ContextStep } from "./types";

export type { ContextStep };

export interface NodeOutput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  success: boolean;
  error: string | null;
}

/**
 * Build reverse adjacency map: targetNodeId → [sourceNodeIds]
 */
export function buildParentMap(edges: EditorEdge[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const e of edges) {
    if (!parents.has(e.target)) parents.set(e.target, []);
    parents.get(e.target)!.push(e.source);
  }
  return parents;
}

/**
 * Build forward adjacency map: sourceNodeId → [{ targetId, sourceHandle }]
 */
export function buildForwardMap(
  edges: EditorEdge[],
): Map<string, { targetId: string; sourceHandle: string | null }[]> {
  const forward = new Map<string, { targetId: string; sourceHandle: string | null }[]>();
  for (const e of edges) {
    if (!forward.has(e.source)) forward.set(e.source, []);
    forward.get(e.source)!.push({ targetId: e.target, sourceHandle: e.sourceHandle ?? null });
  }
  return forward;
}

/**
 * Recursively build a ContextStep chain (linked list) from a flat outputs map.
 * Walks parents backwards: node → parent → grandparent → ...
 */
export function buildAncestorChain(
  nodeId: string,
  parents: Map<string, string[]>,
  outputs: Map<string, NodeOutput>,
  nodes: EditorNode[],
): ContextStep | undefined {
  const parentIds = parents.get(nodeId);
  if (!parentIds || parentIds.length === 0) return undefined;

  const parentId = parentIds[0];
  const parentOutput = outputs.get(parentId);
  if (!parentOutput) return undefined;

  const parentNode = nodes.find((n) => n.id === parentId);
  const grandparentChain = buildAncestorChain(parentId, parents, outputs, nodes);

  const step: ContextStep = {
    name: parentNode?.data.title ?? "Unknown",
    outputName: (parentNode?.data.metadata as Record<string, string>)?.outputName || undefined,
    output: parentOutput.data ?? null,
    success: parentOutput.success,
    error: parentOutput.error,
  };
  if (grandparentChain) {
    step.previousStep = grandparentChain;
  }
  return step;
}

/**
 * Convert a flat WorkflowContext (from editor state) to a NodeOutput map
 * that buildAncestorChain can consume.
 */
export function outputsFromContext(context: WorkflowContext): Map<string, NodeOutput> {
  const map = new Map<string, NodeOutput>();
  for (const [nodeId, entry] of Object.entries(context)) {
    map.set(nodeId, {
      data: entry.output,
      success: entry.success,
      error: entry.error,
    });
  }
  return map;
}

/**
 * Evaluate an expression with previousStep as the input.
 * Also destructures any named outputs (from Output Name) as top-level variables.
 * Used by Transform Data and Conditional nodes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function evaluateExpression(expression: string, input: any): any {
  if (!input || typeof input !== "object") {
    const fn = new Function("previousStep", `return (${expression})`);
    return fn(input);
  }
  const keys = Object.keys(input);
  const fn = new Function(`const {${keys.join(", ")}} = arguments[0]; return (${expression})`);
  return fn(input);
}

/**
 * Wrap a Transform Data result with an output name if provided.
 * If outputName is set, returns { [outputName]: result }.
 * Otherwise returns the raw result.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapTransformOutput(outputName: string | undefined, result: any): any {
  if (outputName && outputName.trim()) {
    return { [outputName.trim()]: result };
  }
  return result;
}

/**
 * Resolve the input for an expression node (Transform Data / Conditional).
 * Uses the ancestor chain output if available, otherwise falls back to meta.body.
 *
 * Builds a flat object where:
 * - `previousStep` = immediate parent's output (quick access)
 * - Named outputs (from Output Name) are top-level keys (no chaining needed)
 *   e.g. if ancestor has outputName "step1", then `step1.test` works directly
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildExpressionChain(chain: ContextStep | undefined, flat?: Record<string, any>): any {
  if (!chain) return {};

  // Collect named outputs into flat object
  if (!flat) flat = {};
  if (chain.outputName && chain.output && typeof chain.output === "object") {
    // Unwrap: if output is { step1: 45 }, extract just 45
    const wrapped = chain.output[chain.outputName];
    flat[chain.outputName] = wrapped !== undefined ? wrapped : chain.output;
  }

  // Recurse to grandparent first, so flat collects all ancestors
  if (chain.previousStep) {
    buildExpressionChain(chain.previousStep, flat);
  }

  // Build the immediate parent object with previousStep pointing to grandparent's output
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentOutput: any = chain.output && typeof chain.output === "object" ? { ...chain.output } : {};
  if (chain.previousStep) {
    parentOutput.previousStep = chain.previousStep.output ?? {};
  }

  // Merge: named outputs at top level, previousStep for quick parent access
  return { ...flat, previousStep: parentOutput };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveExpressionInput(meta: Record<string, string>, ancestorChain: ContextStep | undefined): any {
  if (ancestorChain) {
    return buildExpressionChain(ancestorChain);
  }
  const body = meta.body ? JSON.parse(meta.body) : {};
  return { previousStep: body };
}

/**
 * Find root nodes (no incoming edges).
 */
export function findRoots(nodes: EditorNode[], edges: EditorEdge[]): EditorNode[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !hasIncoming.has(n.id));
}
