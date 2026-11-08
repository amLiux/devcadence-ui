"use client";

import { useAIList } from "./use-ai-list";
import type { AIContext, AIMemory, AIPersona, AIPrompt } from "./types";

export function LLMInputPreview({
  meta,
  prompts,
}: {
  meta: Record<string, string>;
  prompts: AIPrompt[];
}) {
  const personas = useAIList<AIPersona>("/api/ai/personas");
  const contexts = useAIList<AIContext>("/api/ai/context");
  const memories = useAIList<AIMemory>("/api/ai/memory");

  const selectedPrompt = prompts.find((prompt) => prompt.id === meta.promptId);
  const personaName = personas.find((persona) => persona.id === meta.personaId)?.name;
  const contextNames = contexts
    .filter((context) => meta.contextIds?.split(",").includes(context.id))
    .map((context) => context.name);
  const memoryNames = memories
    .filter((memory) => meta.memoryIds?.split(",").includes(memory.id))
    .map((memory) => memory.name);

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border/50 p-3">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        LLM Input Preview
      </p>
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">System prompt layers:</p>
        <ul className="text-[10px] text-muted-foreground list-disc list-inside">
          {personaName ? (
            <li>Persona: {personaName}</li>
          ) : (
            <li>Default identity (no persona)</li>
          )}
          {contextNames.length > 0 ? (
            <li>Context: {contextNames.join(", ")}</li>
          ) : (
            <li>No context selected</li>
          )}
          {memoryNames.length > 0 ? (
            <li>Memory: {memoryNames.join(", ")}</li>
          ) : (
            <li>No memory selected</li>
          )}
          {meta.systemPrompt ? <li>Node system prompt</li> : <li>No node system prompt</li>}
        </ul>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">User prompt:</p>
        {selectedPrompt ? (
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
            {selectedPrompt.template}
          </pre>
        ) : (
          <p className="text-[10px] text-destructive">No saved prompt selected</p>
        )}
      </div>
    </div>
  );
}
