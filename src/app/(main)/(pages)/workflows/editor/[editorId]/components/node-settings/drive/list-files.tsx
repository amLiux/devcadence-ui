"use client";

import { TextField } from "@/components/composed/text-field";
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
      <TextField
        label="Name contains"
        optional
        value={meta.query || ""}
        onChange={(value) => handleChange("query", value)}
        placeholder="invoice"
      />
      <TextField
        label="Folder ID"
        optional
        value={meta.folderId || ""}
        onChange={(value) => handleChange("folderId", value)}
        placeholder="1AbC..."
        hint={
          <>
            From the folder URL:{" "}
            <code className="bg-muted px-1 rounded">drive.google.com/drive/folders/&lt;ID&gt;</code>.
          </>
        }
      />
      <TextField
        label="Page size"
        value={meta.pageSize || ""}
        onChange={(value) => handleChange("pageSize", value)}
        placeholder="20"
        hint="1-100."
      />
      <p className="text-[10px] text-muted-foreground">
        With <code className="bg-muted px-1 rounded">drive.file</code> only files created by the app
        or picked by the user are visible. Output:{" "}
        <code className="bg-muted px-1 rounded">files</code>.
      </p>
    </GoogleSettingsShell>
  );
}
