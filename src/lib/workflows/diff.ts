import { parseGraph, type GraphEdge, type GraphNode } from "./graph";

export interface FieldDiff {
  key: string;
  before: string | null;
  after: string | null;
}

export interface NodeDiff {
  id: string;
  title: string;
  fields: FieldDiff[];
}

export interface EdgeDiff {
  id: string;
  label: string;
  fields: FieldDiff[];
}

export interface WorkflowDiff {
  nodes: { added: NodeDiff[]; removed: NodeDiff[]; changed: NodeDiff[] };
  edges: { added: EdgeDiff[]; removed: EdgeDiff[]; changed: EdgeDiff[] };
  summary: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesChanged: number;
    edgesAdded: number;
    edgesRemoved: number;
    edgesChanged: number;
  };
  hasChanges: boolean;
}

export interface DiffableWorkflow {
  nodes?: string | null;
  edges?: string | null;
}

const EMPTY: WorkflowDiff = {
  nodes: { added: [], removed: [], changed: [] },
  edges: { added: [], removed: [], changed: [] },
  summary: {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesChanged: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    edgesChanged: 0,
  },
  hasChanges: false,
};

/** Normalizes a value so blank and missing fields compare as equal. */
function comparable(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FieldDiff[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const fields: FieldDiff[] = [];

  for (const key of [...keys].sort()) {
    const previous = comparable(before[key]);
    const next = comparable(after[key]);
    if (previous !== next) fields.push({ key, before: previous, after: next });
  }

  return fields;
}

function nodeTitle(node: GraphNode): string {
  return String(node.data?.title || node.id);
}

function nodeFields(node: GraphNode): Record<string, unknown> {
  return {
    ...node.data?.metadata,
    title: node.data?.title,
    type: node.data?.type,
  };
}

function edgeLabel(edge: GraphEdge): string {
  return `${edge.source ?? "?"} → ${edge.target ?? "?"}`;
}

function edgeFields(edge: GraphEdge): Record<string, unknown> {
  return {
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
  };
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.id, item);
  return map;
}

function compareNodes(
  beforeList: GraphNode[],
  afterList: GraphNode[],
): WorkflowDiff["nodes"] {
  const before = indexById(beforeList);
  const after = indexById(afterList);

  const added: NodeDiff[] = [];
  const removed: NodeDiff[] = [];
  const changed: NodeDiff[] = [];

  for (const [id, node] of after) {
    if (!before.has(id)) {
      added.push({ id, title: nodeTitle(node), fields: [] });
    }
  }

  for (const [id, node] of before) {
    const current = after.get(id);
    if (!current) {
      removed.push({ id, title: nodeTitle(node), fields: [] });
      continue;
    }

    const fields = diffFields(nodeFields(node), nodeFields(current));
    if (fields.length > 0) {
      changed.push({ id, title: nodeTitle(current), fields });
    }
  }

  const byTitle = (a: NodeDiff, b: NodeDiff) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  added.sort(byTitle);
  removed.sort(byTitle);
  changed.sort(byTitle);

  return { added, removed, changed };
}

function compareEdges(
  beforeList: GraphEdge[],
  afterList: GraphEdge[],
): WorkflowDiff["edges"] {
  const before = indexById(beforeList);
  const after = indexById(afterList);

  const added: EdgeDiff[] = [];
  const removed: EdgeDiff[] = [];
  const changed: EdgeDiff[] = [];

  for (const [id, edge] of after) {
    if (!before.has(id)) added.push({ id, label: edgeLabel(edge), fields: [] });
  }

  for (const [id, edge] of before) {
    const current = after.get(id);
    if (!current) {
      removed.push({ id, label: edgeLabel(edge), fields: [] });
      continue;
    }

    const fields = diffFields(edgeFields(edge), edgeFields(current));
    if (fields.length > 0) changed.push({ id, label: edgeLabel(current), fields });
  }

  const byLabel = (a: EdgeDiff, b: EdgeDiff) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
  added.sort(byLabel);
  removed.sort(byLabel);
  changed.sort(byLabel);

  return { added, removed, changed };
}

/**
 * Compares two workflow snapshots by node and edge id. `before` is usually the
 * stored version and `after` the current canvas, so "added" means new since
 * that version.
 */
export function diffWorkflows(
  before: DiffableWorkflow,
  after: DiffableWorkflow,
): WorkflowDiff {
  const nodes = compareNodes(
    parseGraph<GraphNode>(before.nodes),
    parseGraph<GraphNode>(after.nodes),
  );
  const edges = compareEdges(
    parseGraph<GraphEdge>(before.edges),
    parseGraph<GraphEdge>(after.edges),
  );

  const summary = {
    nodesAdded: nodes.added.length,
    nodesRemoved: nodes.removed.length,
    nodesChanged: nodes.changed.length,
    edgesAdded: edges.added.length,
    edgesRemoved: edges.removed.length,
    edgesChanged: edges.changed.length,
  };

  const hasChanges = Object.values(summary).some((count) => count > 0);
  if (!hasChanges) return { ...EMPTY, nodes, edges, summary };

  return { nodes, edges, summary, hasChanges };
}
