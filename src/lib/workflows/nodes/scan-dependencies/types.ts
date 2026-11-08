export type Severity = "critical" | "high" | "moderate" | "low";

export interface Finding {
  name: string;
  installedVersion: string;
  severity: Severity;
  title: string;
  cve?: string;
  ghsa?: string;
  fixedVersion?: string;
  source: string;
}

export interface ScanResult {
  findings: Finding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  hasFindings: boolean;
  maxSeverity: Severity | null;
}

export interface Dependency {
  name: string;
  version: string;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

export function severityRank(severity: string): number {
  return SEVERITY_ORDER[severity as Severity] ?? 0;
}

export function passesFilter(severity: string, filter: string): boolean {
  if (filter === "all" || !filter) return true;
  return severityRank(severity) >= severityRank(filter);
}
