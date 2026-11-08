"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useModal } from "@/providers/modal-provider";
import type { Project, Workflow } from "@/lib/types";

export function MoveWorkflowForm({
  workflow,
  projects,
  onMove,
}: {
  workflow: Workflow;
  projects: Project[];
  onMove: (id: string, projectId: string) => Promise<void>;
}) {
  const { setClose } = useModal();
  const [projectId, setProjectId] = useState(workflow.projectId);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMove = async () => {
    setMoving(true);
    setError(null);
    try {
      await onMove(workflow.id, projectId);
      setClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the workflow.");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="move-project">Project</Label>
        <select
          id="move-project"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={handleMove} disabled={moving || projectId === workflow.projectId}>
          {moving ? "Moving..." : "Move"}
        </Button>
      </div>
    </div>
  );
}
