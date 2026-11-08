"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JsonField } from "@/components/composed/json-field";
import { useEditor } from "@/providers/editor-provider";
import { NodeSettingsProps } from "./types";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "./expression-nodes";
import { groupReusableWorkflows } from "@/lib/workflows/projects";

export function CallWorkflowSettings({
  meta,
  handleChange,
  updateMeta,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  const { reusableWorkflows, reusableWorkflowsLoading, projectId } = useEditor();
  const groups = groupReusableWorkflows(reusableWorkflows, projectId);

  return (
    <div className="space-y-3">
      {hasParentEdge ? (
        <InheritedDataPanel output={parentOutput} />
      ) : (
        <InheritedDataPanelDisabled />
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Target Workflow</Label>
        <Select
          value={meta.workflowId || ""}
          onValueChange={(val) => {
            const workflowId = val ?? "";
            // Persist the display name alongside the id so the node card can show
            // it without an extra fetch. One patch, so it cannot race with itself.
            const workflowName =
              reusableWorkflows.find((workflow) => workflow.id === workflowId)?.name ?? "";
            if (updateMeta) {
              updateMeta({ workflowId, workflowName });
            } else {
              handleChange("workflowId", workflowId);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={reusableWorkflowsLoading ? "Loading..." : "Select workflow"}
            >
              {(value) =>
                reusableWorkflows.find((workflow) => workflow.id === value)?.name || value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.project.id}>
                <SelectLabel>{group.project.name}</SelectLabel>
                {group.workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {groups.length === 0 && !reusableWorkflowsLoading && (
          <p className="text-[10px] text-muted-foreground">
            No reusable workflows found. Mark a workflow as &quot;Reusable&quot; to use it here.
          </p>
        )}
      </div>

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
