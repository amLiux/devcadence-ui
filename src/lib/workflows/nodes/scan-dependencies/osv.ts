import type { Dependency, Finding, Severity } from "./types";
import { osvEcosystem } from "./manifest";

function mapOsvSeverity(severityEntries?: Array<{ type: string; score?: string }>): Severity {
  if (!severityEntries?.length) return "low";
  const cvss = severityEntries.find((entry) => entry.type === "CVSS_V3");
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

export async function queryOsv(deps: Dependency[], ecosystem: string): Promise<Finding[]> {
  const queries = deps.map((dependency) => ({
    package: { name: dependency.name, ecosystem: osvEcosystem(ecosystem) },
    version: dependency.version,
  }));

  const response = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    throw new Error(`OSV API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
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
  for (let index = 0; index < deps.length; index++) {
    const dependency = deps[index];
    const result = data.results[index];
    if (!result?.vulns) continue;
    for (const vulnerability of result.vulns) {
      const severity = mapOsvSeverity(vulnerability.severity);
      const cve = vulnerability.aliases?.find((alias) => alias.startsWith("CVE-"));
      const ghsa = vulnerability.id.startsWith("GHSA-")
        ? vulnerability.id
        : vulnerability.aliases?.find((alias) => alias.startsWith("GHSA-"));
      let fixedVersion: string | undefined;
      for (const affected of vulnerability.affected ?? []) {
        for (const range of affected.ranges ?? []) {
          for (const event of range.events) {
            if (event.fixed) fixedVersion = event.fixed;
          }
        }
      }
      findings.push({
        name: dependency.name,
        installedVersion: dependency.version,
        severity,
        title: vulnerability.summary,
        cve,
        ghsa,
        fixedVersion,
        source: "OSV",
      });
    }
  }
  return findings;
}
