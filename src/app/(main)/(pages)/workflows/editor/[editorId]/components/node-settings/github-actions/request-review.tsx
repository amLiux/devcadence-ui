"use client";

import { Label } from "@/components/ui/label";
import { GitHubIssueSelect } from "@/components/composed/github-issue-select";
import { GitHubAssigneesSelect } from "@/components/composed/github-assignees-select";
import { RepoField } from "../repo-field";
import type { NodeSettingsProps } from "../types";

export function RequestReviewSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Pull Request</Label>
        <GitHubIssueSelect
          value={meta.prNumber || ""}
          onChange={(value) => handleChange("prNumber", value)}
          repo={meta.repo || ""}
          type="pulls"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Reviewers</Label>
        <GitHubAssigneesSelect
          value={meta.reviewers || ""}
          onChange={(value) => handleChange("reviewers", value)}
          repo={meta.repo || ""}
        />
      </div>
    </div>
  );
}
