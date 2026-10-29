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
    if (!repo) {
      setBranches([]);
      return;
    }
    setLoading(true);
    const [owner, name] = repo.split("/");
    fetch(`/api/github/repos/${owner}/${name}/branches`)
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.data) ? data.data : []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
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
        {selected ? (
          <span className="flex items-center gap-1.5 truncate text-sm">
            <GitBranch className="h-3 w-3 shrink-0" />
            {selected.name}
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
