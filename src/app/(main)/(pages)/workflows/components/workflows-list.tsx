"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, LayoutGrid, Loader2, Plus, Users } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useModal } from "@/providers/modal-provider";
import { WorkflowCard } from "./workflow-card";
import { WorkflowButton } from "./workflow-button";
import { ProjectForm, type ProjectFormValues } from "@/components/forms/project-form";
import { CustomModal } from "@/components/composed/custom-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { filterByProject, defaultProjectId as resolveDefaultProjectId } from "@/lib/workflows/projects";
import type { WorkflowFormValues } from "@/components/forms/workflow-form";
import type { Project, Workflow } from "@/lib/types";
import { ProjectRailItem } from "./project-rail-item";

export function Workflows() {
  const { request, loading } = useApi();
  const { setOpen, setClose } = useModal();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [workflowData, projectData] = await Promise.all([
        request<{ workflows: Workflow[] }>({ endpoint: "/api/workflows" }),
        request<{ projects: Project[] }>({ endpoint: "/api/projects" }),
      ]);
      if (workflowData?.workflows) setWorkflows(workflowData.workflows);
      if (projectData?.projects) setProjects(projectData.projects);
    } catch {
      setError("Could not load workflows. Refresh to try again.");
    }
  }, [request]);

  useEffect(() => {
    // State lands after the requests resolve, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const workflow of workflows) {
      next.set(workflow.projectId, (next.get(workflow.projectId) ?? 0) + 1);
    }
    return next;
  }, [workflows]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const visibleWorkflows = filterByProject(workflows, activeProjectId);
  const newWorkflowProjectId = resolveDefaultProjectId(projects, activeProjectId);

  const handleDelete = async (id: string) => {
    await request({ endpoint: `/api/workflows/${id}`, method: "DELETE" });
    setWorkflows((previous) => previous.filter((workflow) => workflow.id !== id));
  };

  const handleUpdate = async (id: string, data: WorkflowFormValues) => {
    const updated = await request<Workflow>({
      endpoint: `/api/workflows/${id}`,
      method: "PUT",
      data,
    });
    if (updated) {
      setWorkflows((previous) =>
        previous.map((workflow) => (workflow.id === id ? updated : workflow)),
      );
    }
    setClose();
  };

  const handleMove = async (id: string, projectId: string) => {
    const updated = await request<Workflow>({
      endpoint: `/api/workflows/${id}`,
      method: "PUT",
      data: { projectId },
    });
    if (updated) {
      setWorkflows((previous) =>
        previous.map((workflow) => (workflow.id === id ? updated : workflow)),
      );
    }
  };

  const handleCreateProject = async (values: ProjectFormValues) => {
    const project = await request<Project>({
      endpoint: "/api/projects",
      method: "POST",
      data: values,
    });
    if (project) {
      setProjects((previous) => [...previous, project]);
      setActiveProjectId(project.id);
    }
    setClose();
  };

  const openCreateProject = () => {
    setOpen(
      <CustomModal title="New Project" subheading="Group related workflows together.">
        <ProjectForm onSubmit={handleCreateProject} />
      </CustomModal>,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Build and manage your automation workflows.</p>
        </div>
        <WorkflowButton projects={projects} defaultProjectId={newWorkflowProjectId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-1 lg:sticky lg:top-6 lg:self-start">
          <ProjectRailItem
            label="All workflows"
            count={workflows.length}
            active={activeProjectId === null}
            icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
            onClick={() => setActiveProjectId(null)}
          />
          {projects.map((project) => (
            <ProjectRailItem
              key={project.id}
              label={project.name}
              count={counts.get(project.id) ?? 0}
              active={activeProjectId === project.id}
              icon={
                project.isShared ? (
                  <Users className="h-4 w-4 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0" />
                )
              }
              onClick={() => setActiveProjectId(project.id)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs mt-2"
            onClick={openCreateProject}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New project
          </Button>
        </aside>

        <section className="min-w-0">
          {loading && workflows.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
            </Card>
          ) : visibleWorkflows.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                {workflows.length === 0
                  ? "No workflows yet. Create your first workflow to get started."
                  : `No workflows in ${activeProject?.name ?? "this view"} yet.`}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  projects={projects}
                  projectName={projectNames.get(workflow.projectId)}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  onMove={handleMove}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
