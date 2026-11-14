"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function AppendRowsSettings({
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
          placeholder="Sheet1!A1"
          value={meta.range || ""}
          onChange={(event) => handleChange("range", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Rows (JSON array)</Label>
        <Textarea
          className="min-h-20 text-xs font-mono"
          placeholder={'[["2026-11-14","ok",42]]'}
          value={meta.rows || ""}
          onChange={(event) => handleChange("rows", event.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          One row per inner array. Also accepts {"{{previousStep.rows}}"}.
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">updatedRange</code> and{" "}
        <code className="bg-muted px-1 rounded">updatedRows</code>.
      </p>
    </GoogleSettingsShell>
  );
}
