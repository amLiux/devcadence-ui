"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubLabelsSelect } from "@/components/composed/github-labels-select";
import { GitHubAssigneesSelect } from "@/components/composed/github-assignees-select";
import { InheritedDataPanel } from "../expression-nodes";
import { InheritedDataPanelDisabled } from "../expression-nodes";
import { RepoField } from "../repo-field";
import type { NodeSettingsProps } from "../types";

export function CreateIssueSettings({
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
        E.g. <code className="bg-muted px-1 rounded">{"Issue for {{previousStep.title}}"}</code>.
      </p>
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Issue Title</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.title}}"
          value={meta.title || ""}
          onChange={(event) => handleChange("title", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Body</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.description}}"
          value={meta.body || ""}
          onChange={(event) => handleChange("body", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Labels</Label>
        <GitHubLabelsSelect
          value={meta.labels || ""}
          onChange={(value) => handleChange("labels", value)}
          repo={meta.repo || ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Assignees</Label>
        <GitHubAssigneesSelect
          value={meta.assignees || ""}
          onChange={(value) => handleChange("assignees", value)}
          repo={meta.repo || ""}
        />
      </div>
    </div>
  );
}
