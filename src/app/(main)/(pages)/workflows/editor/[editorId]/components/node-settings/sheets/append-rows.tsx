"use client";

import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
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
        placeholder="A1"
        inputClassName="font-mono"
        hint="Start point: A1, or 'Hoja 1'!A1 when the tab has spaces."
      />
      <TextAreaField
        label="Rows (JSON array)"
        mono
        value={meta.rows || ""}
        onChange={(value) => handleChange("rows", value)}
        placeholder={'[["2026-11-15","ok",42]]'}
        hint={
          <>
            One inner array per row, in column order from the range.{" "}
            <code className="bg-muted px-1 rounded">[[&quot;d&quot;,&quot;e&quot;,&quot;f&quot;]]</code>{" "}
            writes three cells; pad with empty strings to skip columns. Also accepts{" "}
            {"{{previousStep.rows}}"}.
          </>
        }
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">updatedRange</code> and{" "}
        <code className="bg-muted px-1 rounded">updatedRows</code>.
      </p>
    </GoogleSettingsShell>
  );
}
