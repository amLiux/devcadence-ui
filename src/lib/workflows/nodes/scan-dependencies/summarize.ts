import type { Finding, ScanResult, Severity } from "./types";
import { severityRank } from "./types";

export function summarize(findings: Finding[]): ScanResult["summary"] {
  const summary = { total: findings.length, critical: 0, high: 0, moderate: 0, low: 0 };
  for (const finding of findings) {
    if (finding.severity in summary) {
      summary[finding.severity as keyof typeof summary]++;
    }
  }
  return summary;
}

export function maxSeverity(findings: Finding[]): Severity | null {
  if (!findings.length) return null;
  let max: Severity | null = null;
  for (const finding of findings) {
    if (!max || severityRank(finding.severity) > severityRank(max)) {
      max = finding.severity;
    }
  }
  return max;
}
