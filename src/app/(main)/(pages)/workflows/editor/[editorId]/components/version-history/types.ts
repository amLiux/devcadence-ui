export interface VersionSummary {
  id: string;
  version: number;
  name: string;
  description: string;
  type: string;
  status: string;
  source: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
}

export interface VersionDetail {
  id: string;
  version: number;
  nodes: string | null;
  edges: string | null;
}

export interface VersionsResponse {
  versions: VersionSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface VersionHistoryPanelProps {
  workflowId: string;
  /** Serialized nodes of the live canvas, so the diff reflects unsaved edits. */
  currentNodes: string;
  /** Serialized edges of the live canvas. */
  currentEdges: string;
  /** Called after a restore succeeds; the drawer reloads the canvas. */
  onRestored?: () => void;
}
