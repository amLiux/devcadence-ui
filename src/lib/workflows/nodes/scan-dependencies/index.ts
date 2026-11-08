import { getGitHubToken } from "@/lib/github";
import { resolveTemplates, wrapTransformOutput, type ContextStep } from "@/lib/workflow-context";
import type { LogEntry, NodeHandlerResult } from "../types";
import { fetchManifest, parseManifest } from "./manifest";
import { queryOsv } from "./osv";
import { queryGitHubAdvisory } from "./github-advisory";
import { maxSeverity, summarize } from "./summarize";
import { passesFilter, type Finding, type ScanResult } from "./types";

export async function handleScanDependencies(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: LogEntry[] = [];
  const repo = resolveTemplates(meta.repo || "", ancestorChain);
  const branch = resolveTemplates(meta.branch || "main", ancestorChain);
  const manifestPath = resolveTemplates(meta.manifestPath || "package.json", ancestorChain);
  const ecosystem = resolveTemplates(meta.ecosystem || "npm", ancestorChain);
  const provider = resolveTemplates(meta.provider || "OSV", ancestorChain);
  const severityFilter = resolveTemplates(meta.severityFilter || "all", ancestorChain);

  if (!repo) {
    return { success: false, message: "Repository is required" };
  }

  logs.push({
    type: "info",
    message: `Scanning ${repo}/${manifestPath} (${ecosystem}) with ${provider}`,
    timestamp: new Date().toISOString(),
  });

  try {
    const token = await getGitHubToken();
    if (!token) {
      return { success: false, message: "GitHub connection is required" };
    }

    const manifestContent = await fetchManifest(repo, manifestPath, branch, token);
    const deps = parseManifest(manifestContent, ecosystem, manifestPath);
    logs.push({
      type: "info",
      message: `Parsed ${deps.length} dependencies`,
      timestamp: new Date().toISOString(),
    });

    if (deps.length === 0) {
      const result: ScanResult = {
        findings: [],
        summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
        hasFindings: false,
        maxSeverity: null,
      };
      return {
        success: true,
        message: "Scan complete: no dependencies found",
        data: wrapTransformOutput(meta.outputName, result),
        logs,
      };
    }

    let findings: Finding[] = [];
    if (provider === "GitHub Advisory") {
      findings = await queryGitHubAdvisory(deps, ecosystem, token);
    } else {
      findings = await queryOsv(deps, ecosystem);
    }

    if (severityFilter !== "all") {
      findings = findings.filter((finding) => passesFilter(finding.severity, severityFilter));
    }

    const result: ScanResult = {
      findings,
      summary: summarize(findings),
      hasFindings: findings.length > 0,
      maxSeverity: maxSeverity(findings),
    };

    const level = result.hasFindings
      ? result.maxSeverity === "critical" || result.maxSeverity === "high"
        ? "warning"
        : "info"
      : "success";
    logs.push({
      type: level,
      message: `Scan complete: ${findings.length} finding(s)`,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Scan complete: ${findings.length} finding(s)`,
      data: wrapTransformOutput(meta.outputName, result),
      logs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push({
      type: "error",
      message,
      timestamp: new Date().toISOString(),
    });
    return { success: false, message, logs };
  }
}
