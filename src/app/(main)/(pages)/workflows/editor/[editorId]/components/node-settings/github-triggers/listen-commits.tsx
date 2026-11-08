"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { NodeSettingsProps } from "../types";
import { useWorkflowDefault } from "../workflow-variables-context";
import { RepoField } from "../repo-field";

export function ListenCommitsSettings({ meta, handleChange }: NodeSettingsProps) {
  const branch = useWorkflowDefault("githubBranch", meta.branch || "", (value) =>
    handleChange("branch", value),
  );

  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Branch</Label>
          {branch.available && (
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Switch checked={branch.enabled} onCheckedChange={branch.toggle} />
              Use default
            </label>
          )}
        </div>
        <Input
          className="h-8 text-xs"
          placeholder="main"
          value={meta.branch || ""}
          disabled={branch.enabled}
          onChange={(event) => handleChange("branch", event.target.value)}
        />
      </div>
    </div>
  );
}
