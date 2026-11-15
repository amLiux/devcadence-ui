"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonField } from "@/components/composed/json-field";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import { WorkflowPicker } from "./workflow-picker";
import type { NodeSettingsProps } from "./types";

export function ForEachSettings({
  meta,
  handleChange,
  updateMeta,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const setMeta = (patch: Record<string, string>) => {
    if (updateMeta) {
      updateMeta(patch);
      return;
    }
    for (const [key, value] of Object.entries(patch)) handleChange(key, value);
  };

  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}

      <WorkflowPicker
        value={meta.workflowId || ""}
        onChange={(workflowId, workflowName) => setMeta({ workflowId, workflowName })}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Items expression</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder="previousStep.items"
          value={meta.items || ""}
          onChange={(event) => handleChange("items", event.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Must return an array. Use{" "}
          <code className="bg-muted px-1 rounded">previousStep.items</code> or{" "}
          <code className="bg-muted px-1 rounded">{"{{previousStep.items}}"}</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Item name</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="item"
            value={meta.itemName || ""}
            onChange={(event) => handleChange("itemName", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Index name</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="index"
            value={meta.indexName || ""}
            onChange={(event) => handleChange("indexName", event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Max items (1-100)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={1}
            max={100}
            placeholder="25"
            value={meta.maxItems || ""}
            onChange={(event) => handleChange("maxItems", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">On item error</Label>
          <select
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={meta.onError || "abort"}
            onChange={(event) => handleChange("onError", event.target.value)}
          >
            <option value="abort">Abort the loop</option>
            <option value="continue">Record and continue</option>
            <option value="skip">Skip the item</option>
          </select>
        </div>
      </div>

      <JsonField
        label="Extra input (JSON)"
        value={meta.input || "{}"}
        onChange={(value) => handleChange("input", value)}
        placeholder={'{"team": "platform"}'}
        minHeight={70}
        hint={<>Merged with the loop fields and sent to the sub-workflow.</>}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Output name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="loopResults"
          value={meta.outputName || ""}
          onChange={(event) => handleChange("outputName", event.target.value)}
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        The sub-workflow receives its first Input field as{" "}
        <code className="bg-muted px-1 rounded">loop</code>, with{" "}
        <code className="bg-muted px-1 rounded">{"{{loop.item}}"}</code> and{" "}
        <code className="bg-muted px-1 rounded">{"{{loop.index}}"}</code>.
      </p>
    </div>
  );
}
