"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function ReadRowsSettings({
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
        <Label className="text-xs">Spreadsheet ID</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="1AbC... (from the sheet URL)"
          value={meta.spreadsheetId || ""}
          onChange={(event) => handleChange("spreadsheetId", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Range</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="Sheet1!A1:D50"
          value={meta.range || ""}
          onChange={(event) => handleChange("range", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">A1:B2</code> for the first tab. If the tab has
        spaces, quote its name: <code className="bg-muted px-1 rounded">&apos;Hoja 1&apos;!A1:B2</code>.
        Output: <code className="bg-muted px-1 rounded">rows</code> (array of arrays) and{" "}
        <code className="bg-muted px-1 rounded">rowCount</code>, ready for For Each.
      </p>
    </GoogleSettingsShell>
  );
}
