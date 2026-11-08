"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import { RepoField } from "../repo-field";
import type { NodeSettingsProps } from "../types";

export function AddCommentSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> for dynamic values.
      </p>
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue or Pull Request</Label>
        <GitHubIssueSelect
          value={meta.issueNumber || ""}
          onChange={(value) => handleChange("issueNumber", value)}
          repo={meta.repo || ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Comment</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.comment}}"
          value={meta.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
        />
      </div>
    </div>
  );
}
