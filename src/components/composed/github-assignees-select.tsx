"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { User, CheckIcon } from "lucide-react";

interface GitHubContributor {
  login: string;
  avatar_url: string;
}

interface CacheEntry {
  contributors: GitHubContributor[];
  timestamp: number;
}

const contributorCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
  const key = `${owner}/${repo}`;
  const cached = contributorCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.contributors;
  }

  try {
    const res = await fetch(`/api/github/repos/${owner}/${repo}/contributors`);
    if (!res.ok) throw new Error("Failed to fetch contributors");
    const json = await res.json();
    const contributors = json.data || json;
    contributorCache.set(key, { contributors, timestamp: Date.now() });
    return contributors;
  } catch {
    return [];
  }
}

interface GitHubAssigneesSelectProps {
  value: string;
  onChange: (value: string) => void;
  repo: string;
  multi?: boolean;
}

export function GitHubAssigneesSelect({
  value,
  onChange,
  repo,
  multi = true,
}: GitHubAssigneesSelectProps) {
  const [open, setOpen] = useState(false);
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const [owner, repoName] = repo.split("/") || [];

  const loadContributors = useCallback(async () => {
    if (!owner || !repoName) return;
    setLoading(true);
    const data = await fetchContributors(owner, repoName);
    setContributors(data);
    setLoading(false);
  }, [owner, repoName]);

  useEffect(() => {
    if (!open || !owner || !repoName) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadContributors();
    }
  }, [open, owner, repoName, loadContributors]);

  const selectedSet = new Set(value.split(",").filter(Boolean));

  const toggle = (login: string) => {
    if (multi) {
      const next = new Set(selectedSet);
      if (next.has(login)) {
        next.delete(login);
      } else {
        next.add(login);
      }
      onChange(Array.from(next).join(","));
    } else {
      onChange(login);
      setOpen(false);
    }
  };

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
        {selectedSet.size > 0 ? (
          <span className="flex items-center gap-1 truncate text-sm">
            <User className="h-3 w-3 shrink-0" />
            {multi
              ? `${selectedSet.size} assignee${selectedSet.size > 1 ? "s" : ""}`
              : Array.from(selectedSet)[0]}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Select assignees...</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search contributors..." />
          <CommandList>
            <CommandEmpty>
              {!repo
                ? "Select a repository first."
                : loading
                  ? "Loading contributors..."
                  : "No contributors found."}
            </CommandEmpty>
            <CommandGroup>
              {contributors.map((c) => (
                <CommandItem key={c.login} value={c.login} onSelect={() => toggle(c.login)}>
                  <span className="flex items-center gap-2 truncate">
                    <img
                      src={c.avatar_url}
                      alt={c.login}
                      className="h-4 w-4 rounded-full shrink-0"
                    />
                    {c.login}
                  </span>
                  {selectedSet.has(c.login) && <CheckIcon className="ml-auto h-3 w-3" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
