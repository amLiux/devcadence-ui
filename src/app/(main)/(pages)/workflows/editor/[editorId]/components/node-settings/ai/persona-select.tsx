"use client";

import { useAIList } from "./use-ai-list";
import type { AIPersona } from "./types";

export function PersonaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const personas = useAIList<AIPersona>("/api/ai/personas");

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">No persona (default)</option>
      {personas.map((persona) => (
        <option key={persona.id} value={persona.id}>
          {persona.name}
        </option>
      ))}
    </select>
  );
}
