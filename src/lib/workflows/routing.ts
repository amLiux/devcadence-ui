export interface RoutingChild {
  targetId: string;
  sourceHandle: string | null;
}

function hasCondition(data: unknown): data is { condition: unknown } {
  return data !== null && typeof data === "object" && "condition" in data;
}

/**
 * Resolves which nodes should run after a step.
 *
 * Two rules keep branches alive:
 * - every edge of the selected handle is followed, not just the first one;
 * - edges pointing at deleted nodes are dropped, so a stale edge cannot
 *   swallow the rest of the branch.
 */
export function resolveNextNodeIds(
  title: string,
  data: unknown,
  children: RoutingChild[],
  nodeIds: ReadonlySet<string>,
): string[] {
  const reachable = children.filter((child) => nodeIds.has(child.targetId));

  let selected = reachable;

  if (title === "Conditional") {
    if (!hasCondition(data)) return [];

    const handle = data.condition ? "success" : "failure";
    selected = reachable.filter((child) => child.sourceHandle === handle);
  }

  return [...new Set(selected.map((child) => child.targetId))];
}
