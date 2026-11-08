"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { AIConnectionSelect } from "./connection-select";
import { AISelectors } from "./ai-selectors";
import { LLMInputPreview } from "./llm-input-preview";
import { PromptSelect } from "./prompt-select";
import { useAIList } from "./use-ai-list";
import type { AIPrompt } from "./types";

export function PromptSettings({
  meta,
  handleChange,
  updateMeta,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const prompts = useAIList<AIPrompt>("/api/ai/prompts");
  const selectedPrompt = prompts.find((prompt) => prompt.id === meta.promptId);

  const onPromptChange = (promptId: string) => {
    const prompt = prompts.find((item) => item.id === promptId);
    const patch = { promptId, prompt: prompt ? prompt.template : "" };
    if (updateMeta) {
      updateMeta(patch);
    } else {
      handleChange("promptId", patch.promptId);
      handleChange("prompt", patch.prompt);
    }
  };

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
        Use <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> to reference data from
        previous steps. E.g.{" "}
        <code className="bg-muted px-1 rounded">{"{{previousStep.title}}"}</code>.
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs">Node System Prompt</Label>
        <Textarea
          className="min-h-[80px] text-xs font-mono"
          placeholder="Additional system instructions for this node..."
          value={meta.systemPrompt || ""}
          onChange={(event) => handleChange("systemPrompt", event.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Final layer of the system prompt. Use it for node-specific instructions without editing
          the reusable Persona, Context, or Memory from /ai.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Saved Prompt *</Label>
        <PromptSelect value={meta.promptId || ""} onChange={onPromptChange} />
        {prompts.length === 0 && (
          <p className="text-[10px] text-destructive">Create a prompt in /ai first.</p>
        )}
      </div>
      {selectedPrompt && (
        <div className="space-y-1.5">
          <Label className="text-xs">User Prompt Template</Label>
          <Textarea
            className="min-h-[100px] text-xs font-mono bg-muted"
            value={selectedPrompt.template}
            disabled
          />
        </div>
      )}
      <LLMInputPreview meta={meta} prompts={prompts} />
    </div>
  );
}
