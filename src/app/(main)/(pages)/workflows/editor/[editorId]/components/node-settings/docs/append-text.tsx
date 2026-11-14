"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="space-y-1.5">
        <Label className="text-xs">Document ID</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="{{previousStep.document.documentId}}"
          value={meta.documentId || ""}
          onChange={(event) => handleChange("documentId", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Text to append</Label>
        <Textarea
          className="min-h-24 text-xs"
          placeholder="Summary: {{previousStep.summary}}"
          value={meta.text || ""}
          onChange={(event) => handleChange("text", event.target.value)}
        />
      </div>
    </GoogleSettingsShell>
  );
}
