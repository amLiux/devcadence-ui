"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

export function PromptSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> to reference data from previous steps. E.g. <code className="bg-muted px-1 rounded">{"{{previousStep.title}}"}</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">System Prompt</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder="You are a helpful assistant." value={meta.systemPrompt || ""} onChange={(e) => handleChange("systemPrompt", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Prompt</Label>
        <Textarea className="min-h-[100px] text-xs font-mono" placeholder="Summarize the following: {{previousStep.content}}" value={meta.prompt || ""} onChange={(e) => handleChange("prompt", e.target.value)} />
      </div>
    </div>
  );
}

export function ClassifySettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Classify text into one of the provided categories.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Text to Classify</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder="{{previousStep.content}}" value={meta.text || ""} onChange={(e) => handleChange("text", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Categories (comma-separated)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="bug, feature, question" value={meta.categories || ""} onChange={(e) => handleChange("categories", e.target.value)} />
      </div>
    </div>
  );
}

export function ExtractSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <p className="text-[10px] text-muted-foreground">
        Extract structured data from text. Returns a JSON object with the extracted fields.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Text to Extract From</Label>
        <Textarea className="min-h-[80px] text-xs font-mono" placeholder="{{previousStep.content}}" value={meta.text || ""} onChange={(e) => handleChange("text", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Fields to Extract (comma-separated)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="name, email, priority" value={meta.fields || ""} onChange={(e) => handleChange("fields", e.target.value)} />
      </div>
    </div>
  );
}