"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import { GitHubLabelsSelect } from "@/components/composed/github-labels-select";
import { GitHubAssigneesSelect } from "@/components/composed/github-assignees-select";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

function RepoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Repository</Label>
      <GitHubRepoSelect value={value} onChange={onChange} />
    </div>
  );
}

export function CreateIssueSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values. E.g. <code className="bg-muted px-1 rounded">{"Issue for {{previousStep.title}}"}</code>.
      </p>
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue Title</Label>
        <Input className="h-8 text-xs font-mono" placeholder="{{previousStep.title}}" value={meta.title || ""} onChange={(e) => handleChange("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body</Label>
        <Input className="h-8 text-xs font-mono" placeholder="{{previousStep.description}}" value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
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

export function AddCommentSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values.
      </p>
      <RepoField value={meta.repo || ""} onChange={(v) => handleChange("repo", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue or Pull Request</Label>
        <GitHubIssueSelect value={meta.issueNumber || ""} onChange={(v) => handleChange("issueNumber", v)} repo={meta.repo || ""} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Comment</Label>
        <Input className="h-8 text-xs font-mono" placeholder="{{previousStep.comment}}" value={meta.body || ""} onChange={(e) => handleChange("body", e.target.value)} />
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
