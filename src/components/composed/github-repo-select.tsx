"use client";

import React, { useEffect, useState, useRef } from "react";
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

interface GitHubRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
}

let cachedRepos: GitHubRepo[] | null = null;
let cachePromise: Promise<GitHubRepo[]> | null = null;

async function fetchRepos(): Promise<GitHubRepo[]> {
  if (cachedRepos) return cachedRepos;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      cachedRepos = data;
      return data;
    } catch {
      cachedRepos = [];
      return [];
    }
  })();

  return cachePromise;
}

interface GitHubRepoSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function GitHubRepoSelect({ value, onChange }: GitHubRepoSelectProps) {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchRepos().then((data) => {
      setRepos(data);
      setLoading(false);
    });
  }, []);

  const selected = repos.find((r) => r.full_name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-sm font-normal"
          />
        }
      >
        {selected ? (
          <span className="flex items-center gap-1.5 truncate text-sm">
            <GitBranch className="h-3 w-3 shrink-0" />
            {selected.full_name}
            {selected.private && (
              <span className="text-[10px] text-muted-foreground">(private)</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Select repository...</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading repositories..." : "No repositories found."}
            </CommandEmpty>
            <CommandGroup>
              {repos.map((repo) => (
                <CommandItem
                  key={repo.full_name}
                  value={repo.full_name}
                  onSelect={() => {
                    onChange(repo.full_name);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <GitBranch className="h-3 w-3 shrink-0" />
                    {repo.full_name}
                    {repo.private && (
                      <span className="text-[10px] text-muted-foreground">(private)</span>
                    )}
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
