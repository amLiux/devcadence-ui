"use client";

import type { NodeSettingsProps } from "../types";
import { RepoField } from "../repo-field";

export function ListenReleasesSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <RepoField value={meta.repo || ""} onChange={(value) => handleChange("repo", value)} />
    </div>
  );
}
