"use client";

import React, { useEffect, useState } from "react";

const MANIFEST_PATTERNS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
];

interface GitHubTreeItem {
  path: string;
  type: string;
}

const manifestCache = new Map<string, string[]>();

async function fetchManifests(owner: string, repo: string, branch: string): Promise<string[]> {
  const key = `${owner}/${repo}/${branch}`;
  const cached = manifestCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `/api/github/repos/${owner}/${repo}/tree?branch=${encodeURIComponent(branch)}`,
    );
    if (!res.ok) throw new Error("Failed to fetch tree");
    const data = (await res.json()) as { data?: { tree?: GitHubTreeItem[] } };
    const tree = data.data?.tree || [];
    const manifests = tree
      .filter((item) => item.type === "blob" && MANIFEST_PATTERNS.some((p) => item.path.endsWith(p)))
      .map((item) => item.path);
    manifestCache.set(key, manifests);
    return manifests;
  } catch {
    return [];
  }
}

interface GitHubManifestSelectProps {
  repo: string;
  branch: string;
  value: string;
  onChange: (value: string) => void;
}

export function GitHubManifestSelect({ repo, branch, value, onChange }: GitHubManifestSelectProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!repo || !branch) {
        setPaths([]);
        return;
      }
      const [owner, name] = repo.split("/");
      setLoading(true);
      const data = await fetchManifests(owner, name, branch);
      setPaths(data);
      setLoading(false);
    };
    void load();
  }, [repo, branch]);

  const disabled = !repo || !branch || loading;

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">
        {repo && branch
          ? loading
            ? "Loading manifest files..."
            : paths.length > 0
              ? "Select a manifest file..."
              : "No manifest files found"
          : "Select a repository and branch first"}
      </option>
      {paths.map((path) => (
        <option key={path} value={path}>
          {path}
        </option>
      ))}
    </select>
  );
}
