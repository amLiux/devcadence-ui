"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { AIConnectionSelect } from "./connection-select";
import { AISelectors } from "./ai-selectors";

export function ExtractSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
      <div className="space-y-1.5">
        <Label className="text-xs">AI Connection *</Label>
        <AIConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <AISelectors meta={meta} handleChange={handleChange} />
      <p className="text-[10px] text-muted-foreground">
        Extract structured data from text. Returns a JSON object with the extracted fields.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Text to Extract From</Label>
        <Textarea
          className="min-h-[80px] text-xs font-mono"
          placeholder="{{previousStep.content}}"
          value={meta.text || ""}
          onChange={(event) => handleChange("text", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Fields to Extract (comma-separated)</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="name, email, priority"
          value={meta.fields || ""}
          onChange={(event) => handleChange("fields", event.target.value)}
        />
      </div>
    </div>
  );
}
