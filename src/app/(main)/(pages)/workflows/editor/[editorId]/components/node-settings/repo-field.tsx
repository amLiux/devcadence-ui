"use client";

import { Label } from "@/components/ui/label";
import { GitHubRepoSelect } from "@/components/composed/github-repo-select";

export function RepoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Repository</Label>
      <GitHubRepoSelect value={value} onChange={onChange} />
    </div>
  );
}
