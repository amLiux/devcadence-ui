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
import { GitBranch } from "lucide-react";

interface GitHubBranch {
  name: string;
}

const branchCache = new Map<string, GitHubBranch[]>();

async function fetchBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
  const key = `${owner}/${repo}`;
  const cached = branchCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`);
    if (!res.ok) throw new Error("Failed to fetch branches");
    const data = (await res.json()) as { data?: GitHubBranch[] };
    const branches = Array.isArray(data.data) ? data.data : [];
    branchCache.set(key, branches);
    return branches;
  } catch {
    return [];
  }
}

interface GitHubBranchSelectProps {
  repo: string;
  value: string;
  onChange: (value: string) => void;
}

export function GitHubBranchSelect({ repo, value, onChange }: GitHubBranchSelectProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!repo) {
        setBranches([]);
        return;
      }
      const [owner, name] = repo.split("/");
      setLoading(true);
      const data = await fetchBranches(owner, name);
      setBranches(data);
      setLoading(false);
    };
    void load();
  }, [repo]);

  const selected = branches.find((b) => b.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!repo || loading}
            className="w-full justify-between h-8 text-sm font-normal"
          />
        }
      >
        {selected || value ? (
          <span className="flex items-center gap-1.5 truncate text-sm">
            <GitBranch className="h-3 w-3 shrink-0" />
            {selected?.name || value}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {repo ? "Select branch..." : "Select a repository first"}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search branches..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading branches..." : "No branches found."}
            </CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.name}
                  value={branch.name}
                  onSelect={() => {
                    onChange(branch.name);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <GitBranch className="h-3 w-3 shrink-0" />
                    {branch.name}
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
