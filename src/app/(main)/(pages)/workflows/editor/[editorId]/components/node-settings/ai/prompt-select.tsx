"use client";

import { useAIList } from "./use-ai-list";
import type { AIPrompt } from "./types";

export function PromptSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const prompts = useAIList<AIPrompt>("/api/ai/prompts");

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select a saved prompt...</option>
      {prompts.map((prompt) => (
        <option key={prompt.id} value={prompt.id}>
          {prompt.name}
        </option>
      ))}
    </select>
  );
}
