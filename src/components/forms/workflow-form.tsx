"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import type { Project, Workflow } from "@/lib/types";

export interface WorkflowFormValues {
  name: string;
  description: string;
}

interface Props {
  initialData?: Workflow;
  onUpdate?: (id: string, data: WorkflowFormValues) => Promise<void>;
  projects?: Project[];
  defaultProjectId?: string;
}

export function WorkflowForm({
  initialData,
  onUpdate,
  projects,
  defaultProjectId,
}: Props = {}) {
  const router = useRouter();
  const { request } = useApi();
  const { setClose } = useModal();
  const isEdit = Boolean(initialData && onUpdate);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [reusable, setReusable] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedProjectId = projects?.find((project) => project.isShared)?.id;
  // Keep the project select controlled without an effect: the rail selection wins,
  // then Shared, and the user's explicit choice wins over both.
  const selectedProjectId = projectId || defaultProjectId || sharedProjectId || "";

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && initialData && onUpdate) {
        await onUpdate(initialData.id, { name: trimmedName, description: description.trim() });
        return;
      }

      const workflow = await request<Workflow>({
        endpoint: "/api/workflows",
        method: "POST",
        data: {
          name: trimmedName,
          description: description.trim(),
          type: reusable ? "sub-workflow" : "workflow",
          ...(selectedProjectId && { projectId: selectedProjectId }),
        },
      });
      if (workflow) {
        setClose();
        router.push(`/workflows/editor/${workflow.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="workflow-name">Name</Label>
        <Input
          id="workflow-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workflow"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workflow-description">Description</Label>
        <Input
          id="workflow-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this workflow do?"
        />
      </div>
      {!isEdit && projects && projects.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="workflow-project">Project</Label>
          <select
            id="workflow-project"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={selectedProjectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {!isEdit && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="workflow-reusable">Reusable</Label>
            <p className="text-[10px] text-muted-foreground">
              Allow this workflow to be called by other workflows
            </p>
          </div>
          <Switch
            id="workflow-reusable"
            checked={reusable}
            onCheckedChange={setReusable}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {isEdit
            ? submitting
              ? "Saving..."
              : "Save Changes"
            : submitting
              ? "Creating..."
              : "Create Workflow"}
        </Button>
      </div>
    </div>
  );
}
