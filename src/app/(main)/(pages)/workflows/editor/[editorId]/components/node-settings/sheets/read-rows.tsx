"use client";

import { TextField } from "@/components/composed/text-field";
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
      <TextField
        label="Spreadsheet ID"
        value={meta.spreadsheetId || ""}
        onChange={(value) => handleChange("spreadsheetId", value)}
        placeholder="1AbC..."
        inputClassName="font-mono"
        hint="From the sheet URL: docs.google.com/spreadsheets/d/<ID>/edit."
      />
      <TextField
        label="Range"
        value={meta.range || ""}
        onChange={(value) => handleChange("range", value)}
        placeholder="A1:D50"
        inputClassName="font-mono"
        hint={
          <>
            Use <code className="bg-muted px-1 rounded">A1:B2</code> for the first tab. If the tab
            has spaces: <code className="bg-muted px-1 rounded">&apos;Hoja 1&apos;!A1:B2</code>.
          </>
        }
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">rows</code> (array of arrays) and{" "}
        <code className="bg-muted px-1 rounded">rowCount</code>, ready for For Each.
      </p>
    </GoogleSettingsShell>
  );
}
