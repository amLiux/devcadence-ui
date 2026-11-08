"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";
import { useWorkflowDefault } from "./workflow-variables-context";

export function RepoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const defaults = useWorkflowDefault("githubRepo", value, onChange);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Repository</Label>
        {defaults.available && (
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Switch checked={defaults.enabled} onCheckedChange={defaults.toggle} />
            Use default
          </label>
        )}
      </div>
      <div className={defaults.enabled ? "pointer-events-none opacity-60" : ""}>
        <GitHubRepoSelect value={value} onChange={onChange} />
      </div>
    </div>
  );
}
