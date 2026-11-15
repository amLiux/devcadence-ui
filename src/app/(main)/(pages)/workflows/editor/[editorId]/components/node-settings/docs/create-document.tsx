"use client";

import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function CreateDocumentSettings({
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
        label="Title"
        value={meta.title || ""}
        onChange={(value) => handleChange("title", value)}
        placeholder="Report {{previousStep.date}}"
      />
      <TextAreaField
        label="Initial text"
        optional
        value={meta.initialText || ""}
        onChange={(value) => handleChange("initialText", value)}
        placeholder="{{previousStep.summary}}"
      />
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">document</code> with documentId, title,
        text and documentUrl.
      </p>
    </GoogleSettingsShell>
  );
}
