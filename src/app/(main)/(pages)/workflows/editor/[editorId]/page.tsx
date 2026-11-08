"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { EditorProvider } from "@/providers/editor-provider";
import { EditorShell } from "./components/editor-shell";
import type { Project, Workflow } from "@/lib/types";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { request, loading } = useApi();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (params.editorId) {
      request<Workflow>({ endpoint: `/api/workflows/${params.editorId}` }).then((data) => {
        if (data) {
          setWorkflow(data);
        } else {
          router.push("/workflows");
        }
      });
    }
  }, [params.editorId, request, router]);

  useEffect(() => {
    request<{ projects: Project[] }>({ endpoint: "/api/projects" })
      .then((data) => {
        if (data?.projects) setProjects(data.projects);
      })
      .catch(() => {
        /* the breadcrumb simply falls back to the workflow name */
      });
  }, [request]);

  if (loading || !workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorProvider>
      <EditorShell
        workflow={workflow}
        projectName={projects.find((project) => project.id === workflow.projectId)?.name}
        onWorkflowUpdate={setWorkflow}
        saveRef={saveRef}
      />
    </EditorProvider>
  );
}
