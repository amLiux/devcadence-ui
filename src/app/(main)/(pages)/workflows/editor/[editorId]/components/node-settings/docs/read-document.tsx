"use client";

import { TextField } from "@/components/composed/text-field";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function ReadDocumentSettings({
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
        label="Document ID"
        value={meta.documentId || ""}
        onChange={(value) => handleChange("documentId", value)}
        placeholder="{{previousStep.document.documentId}}"
        inputClassName="font-mono"
        hint="From the document URL: docs.google.com/document/d/<ID>/edit."
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">document</code> with the full plain text
        plus title and documentUrl.
      </p>
    </GoogleSettingsShell>
  );
}
