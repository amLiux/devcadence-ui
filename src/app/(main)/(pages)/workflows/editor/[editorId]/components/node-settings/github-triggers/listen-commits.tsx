"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { RepoField } from "../repo-field";

export function ListenCommitsSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
      <div className="space-y-1.5">
        <Label className="text-xs">Branch</Label>
        <Input
          className="h-8 text-xs"
          placeholder="main"
          value={meta.branch || ""}
          onChange={(event) => handleChange("branch", event.target.value)}
        />
      </div>
    </div>
  );
}
