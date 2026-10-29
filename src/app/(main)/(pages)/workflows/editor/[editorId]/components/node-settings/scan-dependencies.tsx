"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import { GitHubBranchSelect } from "@/components/composed/github-branch-select";
import { GitHubManifestSelect } from "@/components/composed/github-manifest-select";
import type { NodeSettingsProps } from "./types";

function detectEcosystem(path: string): string | null {
  const filename = path.split("/").pop()?.toLowerCase() || "";
  if (filename === "package.json") return "npm";
  if (filename === "requirements.txt" || filename === "pyproject.toml") return "python";
  return null;
}

export function ScanDependenciesSettings({ meta, handleChange, updateMeta }: NodeSettingsProps) {
  const repo = (meta.repo || "").trim();
  const branch = (meta.branch || "").trim();
  const manifestPath = (meta.manifestPath || "").trim();
  const detectedEcosystem = detectEcosystem(manifestPath);
  const ecosystemLocked = detectedEcosystem !== null;

  const setRepo = (v: string) => {
    if (updateMeta) {
      updateMeta({ repo: v, branch: "", manifestPath: "" });
    } else {
      handleChange("repo", v);
    }
  };

  const setBranch = (v: string) => {
    if (updateMeta) {
      updateMeta({ branch: v, manifestPath: "" });
    } else {
      handleChange("branch", v);
    }
  };

  const setManifestPath = (v: string) => {
    const patch: Record<string, string> = { manifestPath: v };
    const detected = detectEcosystem(v);
    if (detected) {
      patch.ecosystem = detected;
    }
    if (updateMeta) {
      updateMeta(patch);
    } else {
      handleChange("manifestPath", v);
      if (detected) handleChange("ecosystem", detected);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Scan Dependencies</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Repository</Label>
        <GitHubRepoSelect value={repo} onChange={setRepo} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <GitHubBranchSelect repo={repo} value={branch} onChange={setBranch} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Manifest Path</Label>
        <GitHubManifestSelect repo={repo} branch={branch} value={manifestPath} onChange={setManifestPath} />
        <p className="text-[10px] text-muted-foreground">
          Auto-detected: package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, pom.xml
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Ecosystem</Label>
        <select
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          value={detectedEcosystem || meta.ecosystem || "npm"}
          disabled={ecosystemLocked}
          onChange={(e) => handleChange("ecosystem", e.target.value)}
        >
          <option value="npm">Node.js</option>
          <option value="python">Python</option>
        </select>
        {ecosystemLocked && (
          <p className="text-[10px] text-muted-foreground">
            Auto-detected from manifest path
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Provider</Label>
        <select
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={meta.provider || "OSV"}
          onChange={(e) => handleChange("provider", e.target.value)}
        >
          <option value="OSV">OSV</option>
          <option value="GitHub Advisory">GitHub Advisory</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Severity Filter</Label>
        <select
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={meta.severityFilter || "all"}
          onChange={(e) => handleChange("severityFilter", e.target.value)}
        >
          <option value="all">All severities</option>
          <option value="low">Low or higher</option>
          <option value="moderate">Moderate or higher</option>
          <option value="high">High or higher</option>
          <option value="critical">Critical only</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="scanResult"
          value={meta.outputName || ""}
          onChange={(e) => handleChange("outputName", e.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Requires a GitHub connection to list repos, branches, and manifest files.
      </p>
    </div>
  );
}
