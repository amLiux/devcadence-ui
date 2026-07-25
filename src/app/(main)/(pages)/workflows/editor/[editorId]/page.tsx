"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { EditorProvider } from "@/providers/editor-provider";
import { EditorCanvas } from "./components/editor-canvas";
import { inferTriggerType, TRIGGER_TYPE_LABELS } from "@/lib/types";
import type { Workflow } from "@/lib/types";
import Link from "next/link";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { request, loading } = useApi();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

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

  if (loading || !workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const triggerType = inferTriggerType(workflow.nodes);

  return (
    <EditorProvider>
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-2 flex items-center gap-4 bg-background/50 backdrop-blur-lg z-[10]">
          <Link href="/workflows">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold">{workflow.name}</h1>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {TRIGGER_TYPE_LABELS[triggerType]}
              </Badge>
            </div>
            {workflow.description && (
              <p className="text-xs text-muted-foreground">{workflow.description}</p>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <EditorCanvas workflow={workflow} />
        </div>
      </div>
    </EditorProvider>
  );
}
