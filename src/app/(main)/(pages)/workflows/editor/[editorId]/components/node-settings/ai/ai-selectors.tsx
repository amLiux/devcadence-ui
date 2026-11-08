"use client";

import { Label } from "@/components/ui/label";
import { MultiSelect } from "./multi-select";
import { PersonaSelect } from "./persona-select";
import { useAIList } from "./use-ai-list";
import type { AIContext, AIMemory } from "./types";

export function AISelectors({
  meta,
  handleChange,
}: {
  meta: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}) {
  const contexts = useAIList<AIContext>("/api/ai/context");
  const memories = useAIList<AIMemory>("/api/ai/memory");
  const contextIds = (meta.contextIds || "").split(",").filter(Boolean);
  const memoryIds = (meta.memoryIds || "").split(",").filter(Boolean);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/50 p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        System Prompt Layers
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Persona</Label>
        <PersonaSelect
          value={meta.personaId || ""}
          onChange={(value) => handleChange("personaId", value)}
        />
      </div>
      <MultiSelect
        label="Context"
        items={contexts}
        selectedIds={contextIds}
        onChange={(ids) => handleChange("contextIds", ids.join(","))}
      />
      <MultiSelect
        label="Memory"
        items={memories}
        selectedIds={memoryIds}
        onChange={(ids) => handleChange("memoryIds", ids.join(","))}
      />
    </div>
  );
}
