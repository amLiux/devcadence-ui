"use client";

import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function AppendTextSettings({
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
      <TextAreaField
        label="Text to append"
        value={meta.text || ""}
        onChange={(value) => handleChange("text", value)}
        placeholder="Summary: {{previousStep.summary}}"
      />
    </GoogleSettingsShell>
  );
}
