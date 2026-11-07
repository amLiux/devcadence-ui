"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AIPrompt } from "@/lib/types";

export function PromptForm({
  prompt,
  onChange,
}: {
  prompt: Partial<AIPrompt>;
  onChange: (data: Partial<AIPrompt>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Summarize Issue"
          value={prompt.name || ""}
          onChange={(e) => onChange({ ...prompt, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Template</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder='Summarize the following issue:\n\n{{previousStep.content}}\n\nProvide a brief, actionable summary.'
          value={prompt.template || ""}
          onChange={(e) => onChange({ ...prompt, template: e.target.value })}
        />
        <p className="text-[10px] text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">{"{{variable}}"}</code> for dynamic values.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder="What this prompt does"
          value={prompt.description || ""}
          onChange={(e) => onChange({ ...prompt, description: e.target.value })}
        />
      </div>
    </div>
  );
}
