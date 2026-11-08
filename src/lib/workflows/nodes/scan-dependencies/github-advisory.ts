import { satisfies as semverSatisfies } from "semver";
import type { Dependency, Finding, Severity } from "./types";
import { githubEcosystem, normalizeVersion } from "./manifest";

function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .split(".")
      .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  for (let index = 0; index < Math.max(av.length, bv.length); index++) {
    const x = av[index] ?? 0;
    const y = bv[index] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

const COMPARATORS: Record<string, (comparison: number) => boolean> = {
  "==": (comparison) => comparison === 0,
  "!=": (comparison) => comparison !== 0,
  ">": (comparison) => comparison > 0,
  ">=": (comparison) => comparison >= 0,
  "<": (comparison) => comparison < 0,
  "<=": (comparison) => comparison <= 0,
  "~=": (comparison) => comparison >= 0,
};

function pythonSatisfies(version: string, range: string): boolean {
  const constraints = range.split(",").map((item) => item.trim());
  for (const constraint of constraints) {
    const match = constraint.match(/^([<>=~!]+)\s*([0-9a-zA-Z._\-]+)$/);
    if (!match) return false;

    const comparator = COMPARATORS[match[1]];
    if (!comparator) return false;

    const comparison = compareVersions(version, normalizeVersion(match[2]));
    if (!comparator(comparison)) return false;
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

export async function queryGitHubAdvisory(
  deps: Dependency[],
  ecosystem: string,
  token: string,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const ghEcosystem = githubEcosystem(ecosystem);

  for (const dependency of deps) {
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

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { ecosystem: ghEcosystem, package: dependency.name },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub Advisory API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
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

    for (const vulnerability of data.data?.securityVulnerabilities?.nodes ?? []) {
      if (!versionSatisfies(dependency.version, vulnerability.vulnerableVersionRange, ecosystem)) {
        continue;
      }
      const severity = vulnerability.advisory.severity.toLowerCase() as Severity;
      findings.push({
        name: dependency.name,
        installedVersion: dependency.version,
        severity: ["critical", "high", "moderate", "low"].includes(severity)
          ? severity
          : "low",
        title: vulnerability.advisory.summary,
        ghsa: vulnerability.advisory.ghsaId,
        fixedVersion: vulnerability.firstPatchedVersion?.identifier,
        source: "GitHub Advisory",
      });
    }
  }
  return findings;
}
