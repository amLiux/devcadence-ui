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
import { GitPullRequest, CircleDot, Loader2 } from "lucide-react";

interface GitHubIssue {
  number: number;
  title: string;
  user: { login: string };
  pull_request?: unknown;
}

interface CacheEntry {
  items: GitHubIssue[];
  timestamp: number;
}

const issueCache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 1000;

async function fetchIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
  const key = `${owner}/${repo}`;
  const cached = issueCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.items;
  }

  try {
    const [issuesRes, pullsRes] = await Promise.all([
      fetch(`/api/github/repos/${owner}/${repo}/issues`),
      fetch(`/api/github/repos/${owner}/${repo}/pulls`),
    ]);

    const issuesJson = issuesRes.ok ? await issuesRes.json() : { data: [] };
    const pullsJson = pullsRes.ok ? await pullsRes.json() : { data: [] };
    const issues = issuesJson.data || issuesJson;
    const pulls = pullsJson.data || pullsJson;

    // Deduplicate by number — PRs are also returned by issues endpoint
    const byNumber = new Map<number, GitHubIssue>();
    for (const i of issues) {
      byNumber.set(i.number, { ...i, pull_request: undefined });
    }
    for (const p of pulls) {
      byNumber.set(p.number, { ...p, pull_request: true });
    }
    const items = Array.from(byNumber.values()).sort((a, b) => b.number - a.number);

    issueCache.set(key, { items, timestamp: Date.now() });
    return items;
  } catch {
    return [];
  }
}

interface GitHubIssueSelectProps {
  value: string;
  onChange: (value: string) => void;
  repo: string;
  type?: "all" | "issues" | "pulls";
}

export function GitHubIssueSelect({ value, onChange, repo, type = "all" }: GitHubIssueSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const currentRepoRef = useRef(repo);

  const [owner, repoName] = repo.split("/") || [];

  const loadIssues = useCallback(async () => {
    if (!owner || !repoName) return;
    setLoading(true);
    const data = await fetchIssues(owner, repoName);
    setItems(data);
    setLoading(false);
  }, [owner, repoName]);

  useEffect(() => {
    if (currentRepoRef.current !== repo) {
      currentRepoRef.current = repo;
      loadedRef.current = false;
      setItems([]);
    }
  }, [repo]);

  useEffect(() => {
    if (!open || !owner || !repoName) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadIssues();
    }
  }, [open, owner, repoName, loadIssues]);

  useEffect(() => {
    if (value && owner && repoName && !loadedRef.current) {
      loadedRef.current = true;
      loadIssues();
    }
  }, [value, owner, repoName, loadIssues]);

  const filtered = items.filter((item) => {
    if (type === "issues") return !item.pull_request;
    if (type === "pulls") return !!item.pull_request;
    return true;
  });

  const selectedItem = items.find((i) => String(i.number) === value);

  const disabled = !repo || loading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-8 text-sm font-normal"
          />
        }
      >
        {loading ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </span>
        ) : selectedItem ? (
          <span className="flex items-center gap-1.5 truncate text-sm">
            {selectedItem.pull_request ? (
              <GitPullRequest className="h-3 w-3 shrink-0 text-green-500" />
            ) : (
              <CircleDot className="h-3 w-3 shrink-0 text-purple-500" />
            )}
            #{selectedItem.number} — {selectedItem.title}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Select issue or PR...</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search by number or title..." />
          <CommandList>
            <CommandEmpty>
              {!repo
                ? "Select a repository first."
                : loading
                  ? "Loading..."
                  : "No issues or PRs found."}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((item) => (
                <CommandItem
                  key={`${owner}/${repoName}/${item.number}`}
                  value={`${item.number} ${item.title}`}
                  onSelect={() => {
                    onChange(String(item.number));
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-1.5 truncate text-sm">
                    {item.pull_request ? (
                      <GitPullRequest className="h-3 w-3 shrink-0 text-green-500" />
                    ) : (
                      <CircleDot className="h-3 w-3 shrink-0 text-purple-500" />
                    )}
                    <span className="font-mono">#{item.number}</span>
                    <span className="truncate">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {item.user.login}
                    </span>
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
