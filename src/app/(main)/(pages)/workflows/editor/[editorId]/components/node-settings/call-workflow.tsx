"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonField } from "@/components/composed/json-field";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import { WorkflowPicker } from "./workflow-picker";

export function CallWorkflowSettings({
  meta,
  handleChange,
  updateMeta,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <div className="space-y-3">
      {hasParentEdge ? (
        <InheritedDataPanel output={parentOutput} />
      ) : (
        <InheritedDataPanelDisabled />
      )}

      <WorkflowPicker
        value={meta.workflowId || ""}
        onChange={(workflowId, workflowName) => {
          if (updateMeta) {
            updateMeta({ workflowId, workflowName });
          } else {
            handleChange("workflowId", workflowId);
          }
        }}
      />

      <JsonField
        label="Input (JSON)"
        value={meta.input || "{}"}
        onChange={(value) => handleChange("input", value)}
        placeholder={'{"key": "value"}'}
        minHeight={80}
        hint={<>Values passed to the target workflow&apos;s Input node as {"{{input.*}}"}</>}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Output Name (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="myWorkflow"
          value={meta.outputName || ""}
          onChange={(event) => handleChange("outputName", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Name this output to reference it directly in downstream nodes. If you name it{" "}
        <code className="bg-muted px-1 rounded">auth</code>, downstream nodes can use{" "}
        <code className="bg-muted px-1 rounded">auth.token</code> instead of{" "}
        <code className="bg-muted px-1 rounded">callWorkflow.token</code>.
      </p>

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground">
          <strong>Output:</strong> Access return values via{" "}
          <code className="text-primary">{'{{outputName.field}}'}</code> or{" "}
          <code className="text-primary">{'{{callWorkflow.field}}'}</code>
        </p>
      </div>
    </div>
  );
}
