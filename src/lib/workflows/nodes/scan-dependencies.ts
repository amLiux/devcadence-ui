import { getGitHubToken, githubFetch } from "@/lib/github";
import { resolveTemplates, wrapTransformOutput, type ContextStep } from "@/lib/workflow-context";
import { satisfies as semverSatisfies } from "semver";
import type { NodeHandlerResult, LogEntry } from "./types";

type Severity = "critical" | "high" | "moderate" | "low";

interface Finding {
  name: string;
  installedVersion: string;
  severity: Severity;
  title: string;
  cve?: string;
  ghsa?: string;
  fixedVersion?: string;
  source: string;
}

interface ScanResult {
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

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

function severityRank(severity: string): number {
  return SEVERITY_ORDER[severity as Severity] ?? 0;
}

function passesFilter(severity: string, filter: string): boolean {
  if (filter === "all" || !filter) return true;
  return severityRank(severity as Severity) >= severityRank(filter as Severity);
}

function normalizeVersion(spec: string): string {
  return spec.replace(/^[\^~>=<!\s]+/, "").trim();
}

interface Dependency {
  name: string;
  version: string;
}

function decodeGitHubContent(raw: string): string {
  const cleaned = raw.replace(/\s/g, "");
  return Buffer.from(cleaned, "base64").toString("utf-8");
}

async function fetchManifest(repo: string, path: string, branch: string, token: string): Promise<string> {
  const encodedPath = encodeURIComponent(path);
  const data = (await githubFetch(
    `/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    token,
  )) as { content?: string; encoding?: string; message?: string };
  if (!data.content || data.encoding !== "base64") {
    throw new Error(`Unable to fetch manifest: ${data.message || "no content"}`);
  }
  return decodeGitHubContent(data.content);
}

function parseNpmManifest(content: string): Dependency[] {
  const parsed = JSON.parse(content);
  const deps: Dependency[] = [];
  for (const section of ["dependencies", "devDependencies"]) {
    const block = parsed[section];
    if (!block || typeof block !== "object") continue;
    for (const [name, spec] of Object.entries(block)) {
      deps.push({ name, version: normalizeVersion(String(spec)) });
    }
  }
  return deps;
}

function parseRequirementsTxt(content: string): Dependency[] {
  const deps: Dependency[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    const m = line.match(/^([a-zA-Z0-9_.\-]+)\s*([<>=~!]+)\s*([a-zA-Z0-9_.\-]+)/);
    if (m) deps.push({ name: m[1].toLowerCase(), version: m[3] });
  }
  return deps;
}

function parsePyprojectToml(content: string): Dependency[] {
  const deps: Dependency[] = [];
  const depMatch = content.match(/\[project\][\s\S]*?dependencies\s*=\s*(\[[\s\S]*?\])/);
  if (depMatch) {
    for (const item of depMatch[1].matchAll(/"([^"]+)"/g)) {
      const line = item[1];
      const m = line.match(/^([a-zA-Z0-9_.\-]+)\s*([<>=~!]+)\s*([a-zA-Z0-9_.\-]+)/);
      if (m) deps.push({ name: m[1].toLowerCase(), version: m[3] });
    }
  }
  return deps;
}

function parsePythonManifest(content: string, filename: string): Dependency[] {
  if (filename.toLowerCase() === "pyproject.toml") return parsePyprojectToml(content);
  return parseRequirementsTxt(content);
}

function parseManifest(content: string, ecosystem: string, filename: string): Dependency[] {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return parseNpmManifest(content);
    case "python":
      return parsePythonManifest(content, filename);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

function osvEcosystem(ecosystem: string): string {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return "npm";
    case "python":
      return "PyPI";
    default:
      throw new Error(`Unsupported OSV ecosystem: ${ecosystem}`);
  }
}

function githubEcosystem(ecosystem: string): string {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return "NPM";
    case "python":
      return "PIP";
    default:
      throw new Error(`Unsupported GitHub ecosystem: ${ecosystem}`);
  }
}

function mapOsvSeverity(severityEntries?: Array<{ type: string; score?: string }>): Severity {
  if (!severityEntries?.length) return "low";
  const cvss = severityEntries.find((s) => s.type === "CVSS_V3");
  if (cvss?.score) {
    const score = parseFloat(cvss.score);
    if (score >= 9) return "critical";
    if (score >= 7) return "high";
    if (score >= 4) return "moderate";
    return "low";
  }
  const first = severityEntries[0].type.toLowerCase();
  if (first === "critical" || first === "high" || first === "moderate" || first === "low") {
    return first as Severity;
  }
  return "low";
}

async function queryOsv(deps: Dependency[], ecosystem: string): Promise<Finding[]> {
  const queries = deps.map((d) => ({
    package: { name: d.name, ecosystem: osvEcosystem(ecosystem) },
    version: d.version,
  }));

  const res = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!res.ok) {
    throw new Error(`OSV API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    results: Array<{
      vulns?: Array<{
        id: string;
        summary: string;
        severity?: Array<{ type: string; score?: string }>;
        aliases?: string[];
        affected?: Array<{
          ranges?: Array<{
            type: string;
            events: Array<{ introduced?: string; fixed?: string }>;
          }>;
        }>;
      }>;
    }>;
  };

  const findings: Finding[] = [];
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    const result = data.results[i];
    if (!result?.vulns) continue;
    for (const vuln of result.vulns) {
      const severity = mapOsvSeverity(vuln.severity);
      const cve = vuln.aliases?.find((a) => a.startsWith("CVE-"));
      const ghsa = vuln.id.startsWith("GHSA-") ? vuln.id : vuln.aliases?.find((a) => a.startsWith("GHSA-"));
      let fixedVersion: string | undefined;
      for (const affected of vuln.affected ?? []) {
        for (const range of affected.ranges ?? []) {
          for (const event of range.events) {
            if (event.fixed) fixedVersion = event.fixed;
          }
        }
      }
      findings.push({
        name: dep.name,
        installedVersion: dep.version,
        severity,
        title: vuln.summary,
        cve,
        ghsa,
        fixedVersion,
        source: "OSV",
      });
    }
  }
  return findings;
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split(".")
      .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function pythonSatisfies(version: string, rangeStr: string): boolean {
  const constraints = rangeStr.split(",").map((s) => s.trim());
  for (const constraint of constraints) {
    const m = constraint.match(/^([<>=~!]+)\s*([0-9a-zA-Z._\-]+)$/);
    if (!m) return false;
    const op = m[1];
    const target = normalizeVersion(m[2]);
    const cmp = compareVersions(version, target);
    switch (op) {
      case "==":
        if (cmp !== 0) return false;
        break;
      case "!=":
        if (cmp === 0) return false;
        break;
      case ">":
        if (cmp <= 0) return false;
        break;
      case ">=":
        if (cmp < 0) return false;
        break;
      case "<":
        if (cmp >= 0) return false;
        break;
      case "<=":
        if (cmp > 0) return false;
        break;
      case "~=":
        if (cmp < 0) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

function versionSatisfies(version: string, range: string, ecosystem: string): boolean {
  if (ecosystem.toLowerCase() === "npm") {
    try {
      return semverSatisfies(version, range);
    } catch {
      return false;
    }
  }
  return pythonSatisfies(version, range);
}

async function queryGitHubAdvisory(deps: Dependency[], ecosystem: string, token: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const ghEco = githubEcosystem(ecosystem);

  for (const dep of deps) {
    const query = `query($ecosystem: SecurityAdvisoryEcosystem!, $package: String!) {
      securityVulnerabilities(ecosystem: $ecosystem, package: $package, first: 100) {
        nodes {
          advisory { ghsaId summary severity }
          vulnerableVersionRange
          firstPatchedVersion { identifier }
          package { name }
        }
      }
    }`;

    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { ecosystem: ghEco, package: dep.name } }),
    });

    if (!res.ok) {
      throw new Error(`GitHub Advisory API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      data?: {
        securityVulnerabilities?: {
          nodes: Array<{
            advisory: { ghsaId: string; summary: string; severity: string };
            vulnerableVersionRange: string;
            firstPatchedVersion?: { identifier: string } | null;
            package: { name: string };
          }>;
        };
      };
      errors?: unknown[];
    };

    if (data.errors) {
      throw new Error(`GitHub Advisory GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    for (const vuln of data.data?.securityVulnerabilities?.nodes ?? []) {
      const range = vuln.vulnerableVersionRange;
      if (!versionSatisfies(dep.version, range, ecosystem)) continue;
      const severity = vuln.advisory.severity.toLowerCase() as Severity;
      findings.push({
        name: dep.name,
        installedVersion: dep.version,
        severity: ["critical", "high", "moderate", "low"].includes(severity) ? severity : "low",
        title: vuln.advisory.summary,
        ghsa: vuln.advisory.ghsaId,
        fixedVersion: vuln.firstPatchedVersion?.identifier,
        source: "GitHub Advisory",
      });
    }
  }
  return findings;
}

function summarize(findings: Finding[]): ScanResult["summary"] {
  const summary = { total: findings.length, critical: 0, high: 0, moderate: 0, low: 0 };
  for (const f of findings) {
    if (f.severity in summary) summary[f.severity as keyof typeof summary]++;
  }
  return summary;
}

function maxSeverity(findings: Finding[]): Severity | null {
  if (!findings.length) return null;
  let max: Severity | null = null;
  for (const f of findings) {
    if (!max || severityRank(f.severity) > severityRank(max)) max = f.severity;
  }
  return max;
}

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
      findings = findings.filter((f) => passesFilter(f.severity, severityFilter));
    }

    const summary = summarize(findings);
    const result: ScanResult = {
      findings,
      summary,
      hasFindings: findings.length > 0,
      maxSeverity: maxSeverity(findings),
    };

    const level = result.hasFindings ? (result.maxSeverity === "critical" || result.maxSeverity === "high" ? "warning" : "info") : "success";
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
    const msg = error instanceof Error ? error.message : String(error);
    logs.push({
      type: "error",
      message: msg,
      timestamp: new Date().toISOString(),
    });
    return { success: false, message: msg, logs };
  }
}
