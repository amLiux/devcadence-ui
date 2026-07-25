"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import type { NodeSettingsProps } from "./types";

function RepoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Repository</Label>
      <GitHubRepoSelect value={value} onChange={onChange} />
    </div>
  );
}

export function ListenCommitsSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <Input className="h-8 text-xs" placeholder="main" value={meta.branch || ""} onChange={(e) => handleChange("branch", e.target.value)} />
      </div>
    </div>
  );
}

export function ListenPRsSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Events</Label>
        <Input className="h-8 text-xs" placeholder="opened, closed, merged" value={meta.events || ""} onChange={(e) => handleChange("events", e.target.value)} />
      </div>
    </div>
  );
}

export function ListenIssuesSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Events</Label>
        <Input className="h-8 text-xs" placeholder="opened, closed, labeled" value={meta.events || ""} onChange={(e) => handleChange("events", e.target.value)} />
      </div>
    </div>
  );
}

export function ListenCommentsSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Filter</Label>
        <Input className="h-8 text-xs" placeholder="TODO, needs-review" value={meta.filter || ""} onChange={(e) => handleChange("filter", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">Leave blank to trigger on all comments.</p>
    </div>
  );
}

export function ListenReleasesSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
    </div>
  );
}
