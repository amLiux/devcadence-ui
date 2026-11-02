export interface GraphNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: {
    title?: string;
    type?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source?: string;
  target?: string;
  sourceHandle?: string | null;
  [key: string]: unknown;
}

/** Parses a serialized node or edge list, tolerating missing or invalid JSON. */
export function parseGraph<T = GraphNode>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Counts the nodes and edges of a snapshot. */
export function countGraph(snapshot: {
  nodes?: string | null;
  edges?: string | null;
}): { nodeCount: number; edgeCount: number } {
  return {
    nodeCount: parseGraph(snapshot.nodes).length,
    edgeCount: parseGraph(snapshot.edges).length,
  };
}

interface EdgeEndpoints {
  source?: string | null;
  target?: string | null;
}

/** Drops edges whose endpoints no longer exist, e.g. after a node is deleted. */
export function pruneDanglingEdges<N extends { id: string }, E extends EdgeEndpoints>(
  nodes: N[],
  edges: E[],
): E[] {
  const ids = new Set(nodes.map((node) => node.id));

  return edges.filter(
    (edge) => !!edge.source && !!edge.target && ids.has(edge.source) && ids.has(edge.target),
  );
}
