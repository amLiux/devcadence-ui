export type DashboardRange = "24h" | "7d" | "30d";

export const DASHBOARD_RANGES: DashboardRange[] = ["24h", "7d", "30d"];

export interface DashboardKpis {
  runs: { value: number; previous: number; deltaPct: number | null };
  successRate: { value: number | null; previous: number | null; deltaPp: number | null };
  p95DurationMs: { value: number | null; previous: number | null; deltaPct: number | null };
  aiTokens: { value: number; previous: number; deltaPct: number | null };
  running: number;
}

export interface DashboardVolumePoint {
  bucket: string;
  success: number;
  error: number;
}

export interface DashboardSource {
  source: string;
  count: number;
}

export interface DashboardFailingNode {
  nodeType: string;
  failures: number;
  lastError: string | null;
  lastFailedAt: string;
}

export interface DashboardWorkflowHealth {
  id: string;
  name: string;
  runs: number;
  successRate: number | null;
  p95DurationMs: number | null;
  lastRunAt: string;
  lastStatus: string;
  lastError: string | null;
}

export interface DashboardStats {
  range: DashboardRange;
  window: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  kpis: DashboardKpis;
  volume: DashboardVolumePoint[];
  sources: DashboardSource[];
  failingNodes: DashboardFailingNode[];
  workflows: DashboardWorkflowHealth[];
}
