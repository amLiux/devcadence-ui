"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function ListFilesSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <GoogleSettingsShell
      meta={meta}
      handleChange={handleChange}
      parentOutput={parentOutput}
      hasParentEdge={hasParentEdge}
    >
      <div className="space-y-1.5">
        <Label className="text-xs">Name contains (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="invoice"
          value={meta.query || ""}
          onChange={(event) => handleChange("query", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Folder ID (optional)</Label>
        <Input
          className="h-8 text-xs"
          value={meta.folderId || ""}
          onChange={(event) => handleChange("folderId", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Page size (1-100)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="20"
          value={meta.pageSize || ""}
          onChange={(event) => handleChange("pageSize", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        With <code className="bg-muted px-1 rounded">drive.file</code> only files created by the app
        or picked by the user are visible. Output:{" "}
        <code className="bg-muted px-1 rounded">files</code>.
      </p>
    </GoogleSettingsShell>
  );
}
