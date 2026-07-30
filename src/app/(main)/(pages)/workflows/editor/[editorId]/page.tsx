"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Repeat, FileEdit, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { EditorProvider, useEditor } from "@/providers/editor-provider";
import { EditorCanvas } from "./components/editor-canvas";
import { inferTriggerType, TRIGGER_TYPE_LABELS } from "@/lib/types";
import type { Workflow, WorkflowStatus } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function EditorShell({ workflow, onWorkflowUpdate, saveRef }: { workflow: Workflow; onWorkflowUpdate: (w: Workflow) => void; saveRef: React.MutableRefObject<(() => Promise<void>) | null> }) {
  const router = useRouter();
  const { request } = useApi();
  const { dirty, editor } = useEditor();
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleBack = useCallback(() => {
    if (dirty) {
      setShowUnsavedModal(true);
    } else {
      router.push("/workflows");
    }
  }, [dirty, router]);

  const handleSaveAndExit = async () => {
    if (saveRef.current) {
      await saveRef.current();
    }
    router.push("/workflows");
  };

  const handleDiscardAndExit = () => {
    router.push("/workflows");
  };

  const handleReusableToggle = async (checked: boolean) => {
    const type = checked ? "sub-workflow" : "workflow";
    await request({
      endpoint: `/api/workflows/${workflow.id}`,
      method: "PUT",
      data: { type },
    });
    window.location.reload();
  };

  const STATUS_LABELS: Record<WorkflowStatus, string> = { draft: "Draft", active: "Active", paused: "Paused" };
  const STATUS_ICONS: Record<WorkflowStatus, React.ReactNode> = {
    draft: <FileEdit className="h-3 w-3 shrink-0" />,
    active: <Play className="h-3 w-3 shrink-0" />,
    paused: <Pause className="h-3 w-3 shrink-0" />,
  };

  const handleStatusChange = async (status: WorkflowStatus) => {
    setStatusUpdating(true);
    const res = await request<Workflow>({
      endpoint: `/api/workflows/${workflow.id}`,
      method: "PUT",
      data: { status },
    });
    if (res) onWorkflowUpdate(res);
    await new Promise((r) => setTimeout(r, 400));
    setStatusUpdating(false);
  };

  const liveNodesJson = editor.elements.length > 0 ? JSON.stringify(editor.elements) : workflow.nodes;
  const triggerType = inferTriggerType(liveNodesJson, workflow.type);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-2 flex items-center gap-4 bg-background/50 backdrop-blur-lg z-[10]">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">{workflow.name}</h1>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {TRIGGER_TYPE_LABELS[triggerType]}
            </Badge>
            {dirty && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                Unsaved
              </Badge>
            )}
          </div>
          {workflow.description && (
            <p className="text-xs text-muted-foreground">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="reusable-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Reusable
            </Label>
            <Switch
              id="reusable-toggle"
              checked={workflow.type === "sub-workflow"}
              onCheckedChange={handleReusableToggle}
            />
          </div>
          <div className="w-px h-5 bg-border" />
          <Select value={workflow.status} disabled={statusUpdating} onValueChange={(v) => v && handleStatusChange(v as WorkflowStatus)}>
            <SelectTrigger className="h-7 w-[100px] text-xs gap-1">
              {statusUpdating ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : <>{STATUS_ICONS[workflow.status]}<span>{STATUS_LABELS[workflow.status]}</span></>}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="paused" className="text-xs">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EditorCanvas
          workflow={workflow}
          onSaveRef={saveRef}
        />
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowUnsavedModal(false)} />
          <div className="relative bg-background border rounded-lg shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowUnsavedModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDiscardAndExit}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSaveAndExit}>
                Save & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { request, loading } = useApi();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
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

  if (loading || !workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorProvider>
      <EditorShell workflow={workflow} onWorkflowUpdate={setWorkflow} saveRef={saveRef} />
    </EditorProvider>
  );
}
