"use client";

import React, { useEffect, useState } from "react";

const MANIFEST_PATTERNS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
];

interface GitHubTreeItem {
  path: string;
  type: string;
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
    if (!repo || !branch) {
      setPaths([]);
      return;
    }
    setLoading(true);
    const [owner, name] = repo.split("/");
    fetch(`/api/github/repos/${owner}/${name}/tree?branch=${encodeURIComponent(branch)}`)
      .then((r) => r.json())
      .then((data) => {
        const tree = (data.data?.tree || []) as GitHubTreeItem[];
        const manifests = tree
          .filter((item) => item.type === "blob" && MANIFEST_PATTERNS.some((p) => item.path.endsWith(p)))
          .map((item) => item.path);
        setPaths(manifests);
      })
      .catch(() => setPaths([]))
      .finally(() => setLoading(false));
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
