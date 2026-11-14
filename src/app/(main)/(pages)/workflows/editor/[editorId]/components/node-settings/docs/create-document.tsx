"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input
          className="h-8 text-xs"
          placeholder="Report {{previousStep.date}}"
          value={meta.title || ""}
          onChange={(event) => handleChange("title", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Initial text (optional)</Label>
        <Textarea
          className="min-h-20 text-xs"
          placeholder="{{previousStep.summary}}"
          value={meta.initialText || ""}
          onChange={(event) => handleChange("initialText", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">document</code> with documentId, title,
        text and documentUrl.
      </p>
    </GoogleSettingsShell>
  );
}
