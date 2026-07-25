"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import { GitHubLabelsSelect } from "@/components/composed/github-labels-select";
import { GitHubAssigneesSelect } from "@/components/composed/github-assignees-select";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";
import type { NodeSettingsProps } from "./types";

function RepoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Repository</Label>
      <GitHubRepoSelect value={value} onChange={onChange} />
    </div>
  );
}

export function CreateIssueSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue Title</Label>
        <Input className="h-8 text-xs" placeholder="New issue from workflow" value={meta.title || ""} onChange={(e) => handleChange("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body</Label>
        <Input className="h-8 text-xs" placeholder="Description..." value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Labels</Label>
        <GitHubLabelsSelect value={meta.labels || ""} onChange={(v) => handleChange("labels", v)} repo={meta.repo || ""} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Assignees</Label>
        <GitHubAssigneesSelect value={meta.assignees || ""} onChange={(v) => handleChange("assignees", v)} repo={meta.repo || ""} />
      </div>
    </div>
  );
}

export function AddCommentSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue or Pull Request</Label>
        <GitHubIssueSelect value={meta.issueNumber || ""} onChange={(v) => handleChange("issueNumber", v)} repo={meta.repo || ""} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Comment</Label>
        <Input className="h-8 text-xs" placeholder="Thanks for the feedback!" value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
      </div>
    </div>
  );
}

export function AddLabelSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue or Pull Request</Label>
        <GitHubIssueSelect value={meta.issueNumber || ""} onChange={(v) => handleChange("issueNumber", v)} repo={meta.repo || ""} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <GitHubLabelsSelect value={meta.label || ""} onChange={(v) => handleChange("label", v)} repo={meta.repo || ""} multi={false} />
      </div>
    </div>
  );
}

export function RequestReviewSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Pull Request</Label>
        <GitHubIssueSelect value={meta.prNumber || ""} onChange={(v) => handleChange("prNumber", v)} repo={meta.repo || ""} type="pulls" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Reviewers</Label>
        <GitHubAssigneesSelect value={meta.reviewers || ""} onChange={(v) => handleChange("reviewers", v)} repo={meta.repo || ""} />
      </div>
    </div>
  );
}
