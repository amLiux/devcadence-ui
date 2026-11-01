"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import type { Workflow } from "@/lib/types";

export interface WorkflowFormValues {
  name: string;
  description: string;
}

interface Props {
  initialData?: Workflow;
  onUpdate?: (id: string, data: WorkflowFormValues) => Promise<void>;
}

export function WorkflowForm({ initialData, onUpdate }: Props = {}) {
  const router = useRouter();
  const { request } = useApi();
  const { setClose } = useModal();
  const isEdit = Boolean(initialData && onUpdate);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [reusable, setReusable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
