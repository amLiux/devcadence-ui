import { githubFetch } from "@/lib/github";
import type { Dependency } from "./types";

export function normalizeVersion(spec: string): string {
  return spec.replace(/^[\^~>=<!\s]+/, "").trim();
}

function decodeGitHubContent(raw: string): string {
  const cleaned = raw.replace(/\s/g, "");
  return Buffer.from(cleaned, "base64").toString("utf-8");
}

export async function fetchManifest(
  repo: string,
  path: string,
  branch: string,
  token: string,
): Promise<string> {
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
  const dependencies: Dependency[] = [];
  for (const section of ["dependencies", "devDependencies"]) {
    const block = parsed[section];
    if (!block || typeof block !== "object") continue;
    for (const [name, spec] of Object.entries(block)) {
      dependencies.push({ name, version: normalizeVersion(String(spec)) });
    }
  }
  return dependencies;
}

function parseRequirementsTxt(content: string): Dependency[] {
  const dependencies: Dependency[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    const match = line.match(/^([a-zA-Z0-9_.\-]+)\s*([<>=~!]+)\s*([a-zA-Z0-9_.\-]+)/);
    if (match) dependencies.push({ name: match[1].toLowerCase(), version: match[3] });
  }
  return dependencies;
}

function parsePyprojectToml(content: string): Dependency[] {
  const dependencies: Dependency[] = [];
  const depMatch = content.match(/\[project\][\s\S]*?dependencies\s*=\s*(\[[\s\S]*?\])/);
  if (depMatch) {
    for (const item of depMatch[1].matchAll(/"([^"]+)"/g)) {
      const line = item[1];
      const match = line.match(/^([a-zA-Z0-9_.\-]+)\s*([<>=~!]+)\s*([a-zA-Z0-9_.\-]+)/);
      if (match) dependencies.push({ name: match[1].toLowerCase(), version: match[3] });
    }
  }
  return dependencies;
}

function parsePythonManifest(content: string, filename: string): Dependency[] {
  if (filename.toLowerCase() === "pyproject.toml") return parsePyprojectToml(content);
  return parseRequirementsTxt(content);
}

export function parseManifest(
  content: string,
  ecosystem: string,
  filename: string,
): Dependency[] {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return parseNpmManifest(content);
    case "python":
      return parsePythonManifest(content, filename);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

export function osvEcosystem(ecosystem: string): string {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return "npm";
    case "python":
      return "PyPI";
    default:
      throw new Error(`Unsupported OSV ecosystem: ${ecosystem}`);
  }
}

export function githubEcosystem(ecosystem: string): string {
  switch (ecosystem.toLowerCase()) {
    case "npm":
      return "NPM";
    case "python":
      return "PIP";
    default:
      throw new Error(`Unsupported GitHub ecosystem: ${ecosystem}`);
  }
}
