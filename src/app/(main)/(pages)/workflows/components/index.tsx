"use client";

import React, { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import { WorkflowCard } from "./workflow-card";
import type { WorkflowFormValues } from "@/components/forms/workflow-form";
import type { Workflow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function Workflows() {
  const { request, loading } = useApi();
  const { setClose } = useModal();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    request<{ workflows: Workflow[] }>({ endpoint: "/api/workflows" }).then((data) => {
      if (data?.workflows) setWorkflows(data.workflows);
    });
  }, [request]);

  const handleDelete = async (id: string) => {
    await request({ endpoint: `/api/workflows/${id}`, method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleUpdate = async (id: string, data: WorkflowFormValues) => {
    const updated = await request<Workflow>({
      endpoint: `/api/workflows/${id}`,
      method: "PUT",
      data,
    });
    if (updated) {
      setWorkflows((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
    setClose();
  };

  if (loading && workflows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-20 text-center text-muted-foreground">
          No workflows yet. Create your first workflow to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} onDelete={handleDelete} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}
