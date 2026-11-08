"use client";

import { Label } from "@/components/ui/label";
import { GitHubLabelsSelect } from "@/components/composed/github-labels-select";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";
import { RepoField } from "../repo-field";
import type { NodeSettingsProps } from "../types";

export function AddLabelSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
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
        <Label className="text-xs">Label</Label>
        <GitHubLabelsSelect
          value={meta.label || ""}
          onChange={(value) => handleChange("label", value)}
          repo={meta.repo || ""}
          multi={false}
        />
      </div>
    </div>
  );
}
