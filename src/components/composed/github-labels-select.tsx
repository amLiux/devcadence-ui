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
import { Tag, CheckIcon } from "lucide-react";

interface GitHubLabel {
  name: string;
  color: string;
}

interface CacheEntry {
  labels: GitHubLabel[];
  timestamp: number;
}

const labelCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchLabels(owner: string, repo: string): Promise<GitHubLabel[]> {
  const key = `${owner}/${repo}`;
  const cached = labelCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.labels;
  }

  try {
    const res = await fetch(`/api/github/repos/${owner}/${repo}/labels`);
    if (!res.ok) throw new Error("Failed to fetch labels");
    const json = await res.json();
    const labels = json.data || json;
    labelCache.set(key, { labels, timestamp: Date.now() });
    return labels;
  } catch {
    return [];
  }
}

interface GitHubLabelsSelectProps {
  value: string;
  onChange: (value: string) => void;
  repo: string;
  multi?: boolean;
}

export function GitHubLabelsSelect({
  value,
  onChange,
  repo,
  multi = true,
}: GitHubLabelsSelectProps) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const [owner, repoName] = repo.split("/") || [];

  const loadLabels = useCallback(async () => {
    if (!owner || !repoName) return;
    setLoading(true);
    const data = await fetchLabels(owner, repoName);
    setLabels(data);
    setLoading(false);
  }, [owner, repoName]);

  useEffect(() => {
    if (!open || !owner || !repoName) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadLabels();
    }
  }, [open, owner, repoName, loadLabels]);

  const selectedSet = new Set(value.split(",").filter(Boolean));

  const toggle = (name: string) => {
    if (multi) {
      const next = new Set(selectedSet);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      onChange(Array.from(next).join(","));
    } else {
      onChange(name);
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
            <Tag className="h-3 w-3 shrink-0" />
            {multi
              ? `${selectedSet.size} label${selectedSet.size > 1 ? "s" : ""}`
              : Array.from(selectedSet)[0]}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Select labels...</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>
              {!repo
                ? "Select a repository first."
                : loading
                  ? "Loading labels..."
                  : "No labels found."}
            </CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label.name}
                  value={label.name}
                  onSelect={() => toggle(label.name)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 border"
                      style={{ backgroundColor: `#${label.color}` }}
                    />
                    {label.name}
                  </span>
                  {selectedSet.has(label.name) && <CheckIcon className="ml-auto h-3 w-3" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
