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

export function WorkflowForm() {
  const router = useRouter();
  const { request } = useApi();
  const { setClose } = useModal();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reusable, setReusable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const workflow = await request<Workflow>({
        endpoint: "/api/workflows",
        method: "POST",
        data: { name: name.trim(), description: description.trim(), type: reusable ? "sub-workflow" : "workflow" },
      });
      if (workflow) {
        setClose();
        router.push(`/workflows/editor/${workflow.id}`);
      }
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
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
          {submitting ? "Creating..." : "Create Workflow"}
        </Button>
      </div>
    </div>
  );
}
