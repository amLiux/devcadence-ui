"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import type { NodeSettingsProps } from "./types";

interface AIPersona { id: string; name: string; description: string; }
interface AIContext { id: string; name: string; description: string; }
interface AIMemory { id: string; name: string; description: string; }

function useAIList<T extends { id: string; name: string }>(endpoint: string) {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    request<T[]>({ endpoint }).then((data) => { if (data) setItems(data); });
  }, [request, endpoint]);
  return items;
}

function PersonaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const personas = useAIList<AIPersona>("/api/ai/personas");
  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">No persona (default)</option>
      {personas.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

function MultiSelect({ label, items, selectedIds, onChange }: {
  label: string;
  items: { id: string; name: string; description: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">None created yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                selectedIds.includes(item.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AISelectors({ meta, handleChange }: { meta: Record<string, string>; handleChange: (key: string, value: string) => void }) {
  const contexts = useAIList<AIContext>("/api/ai/context");
  const memories = useAIList<AIMemory>("/api/ai/memory");
  const contextIds = (meta.contextIds || "").split(",").filter(Boolean);
  const memoryIds = (meta.memoryIds || "").split(",").filter(Boolean);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/50 p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">System Prompt Layers</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Persona</Label>
        <PersonaSelect value={meta.personaId || ""} onChange={(v) => handleChange("personaId", v)} />
      </div>
      <MultiSelect label="Context" items={contexts} selectedIds={contextIds} onChange={(ids) => handleChange("contextIds", ids.join(","))} />
      <MultiSelect label="Memory" items={memories} selectedIds={memoryIds} onChange={(ids) => handleChange("memoryIds", ids.join(","))} />
    </div>
  );
}

export function PromptSettings({ meta, handleChange, parentOutput, hasParentEdge }: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge && (
        parentOutput
          ? <InheritedDataPanel output={parentOutput} />
          : <InheritedDataPanelDisabled />
      )}
      <AISelectors meta={meta} handleChange={handleChange} />
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
      <AISelectors meta={meta} handleChange={handleChange} />
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
      <AISelectors meta={meta} handleChange={handleChange} />
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
