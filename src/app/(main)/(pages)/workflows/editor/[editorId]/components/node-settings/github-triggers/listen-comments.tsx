"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { RepoField } from "../repo-field";

export function ListenCommentsSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Filter</Label>
        <Input
          className="h-8 text-xs"
          placeholder="TODO, needs-review"
          value={meta.filter || ""}
          onChange={(event) => handleChange("filter", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Leave blank to trigger on all comments.</p>
    </div>
  );
}
