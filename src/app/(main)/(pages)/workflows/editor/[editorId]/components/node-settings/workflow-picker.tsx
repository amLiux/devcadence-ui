"use client";

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
import { useEditor } from "@/providers/editor-provider";
import { groupReusableWorkflows } from "@/lib/workflows/projects";

export function WorkflowPicker({
  label = "Target Workflow",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (workflowId: string, workflowName: string) => void;
}) {
  const { reusableWorkflows, reusableWorkflowsLoading, projectId } = useEditor();
  const groups = groupReusableWorkflows(reusableWorkflows, projectId);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          const workflowId = next ?? "";
          const workflowName =
            reusableWorkflows.find((workflow) => workflow.id === workflowId)?.name ?? "";
          onChange(workflowId, workflowName);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={reusableWorkflowsLoading ? "Loading..." : "Select workflow"}
          >
            {(selected) =>
              reusableWorkflows.find((workflow) => workflow.id === selected)?.name || selected
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
  );
}
