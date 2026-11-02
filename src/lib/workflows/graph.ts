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
