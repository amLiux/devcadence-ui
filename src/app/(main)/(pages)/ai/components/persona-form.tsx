"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AIPersona } from "@/lib/types";

export function PersonaForm({
  persona,
  onChange,
}: {
  persona: Partial<AIPersona>;
  onChange: (data: Partial<AIPersona>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Code Reviewer"
          value={persona.name || ""}
          onChange={(e) => onChange({ ...persona, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">System Prompt</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder="You are a senior code reviewer. Focus on security, performance, and maintainability..."
          value={persona.systemPrompt || ""}
          onChange={(e) => onChange({ ...persona, systemPrompt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tone (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Professional, concise, constructive"
          value={persona.tone || ""}
          onChange={(e) => onChange({ ...persona, tone: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder="What this persona is for"
          value={persona.description || ""}
          onChange={(e) => onChange({ ...persona, description: e.target.value })}
        />
      </div>
    </div>
  );
}
