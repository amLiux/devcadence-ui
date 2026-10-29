"use client";

import React, { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

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
  const [open, setOpen] = useState(false);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!repo || !branch || loading}
            className="w-full justify-between h-8 text-sm font-normal"
          />
        }
      >
        {value ? (
          <span className="flex items-center gap-1.5 truncate text-sm">
            <FileText className="h-3 w-3 shrink-0" />
            {value}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {repo && branch ? "Select manifest..." : "Select a repository and branch first"}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search manifest files..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading files..." : "No manifest files found."}
            </CommandEmpty>
            <CommandGroup>
              {paths.map((path) => (
                <CommandItem
                  key={path}
                  value={path}
                  onSelect={() => {
                    onChange(path);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FileText className="h-3 w-3 shrink-0" />
                    {path}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
