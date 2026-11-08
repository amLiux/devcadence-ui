"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useEditor } from "@/providers/editor-provider";
import { EditorCanvas } from "./editor-canvas";
import { EditorShellHeader } from "./editor-shell-header";
import { inferTriggerType } from "@/lib/types";
import type { Workflow, WorkflowStatus } from "@/lib/types";

export function EditorShell({
  workflow,
  projectName,
  onWorkflowUpdate,
  saveRef,
}: {
  workflow: Workflow;
  projectName?: string;
  onWorkflowUpdate: (workflow: Workflow) => void;
  saveRef: React.MutableRefObject<(() => Promise<void>) | null>;
}) {
  const router = useRouter();
  const { request } = useApi();
  const { dirty, editor, setSidebarTab } = useEditor();
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("run");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (initialRunId) setSidebarTab("history");
  }, [initialRunId, setSidebarTab]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
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

  const handleStatusChange = async (status: WorkflowStatus) => {
    setStatusUpdating(true);
    const updated = await request<Workflow>({
      endpoint: `/api/workflows/${workflow.id}`,
      method: "PUT",
      data: { status },
    });
    if (updated) onWorkflowUpdate(updated);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setStatusUpdating(false);
  };

  const liveNodesJson =
    editor.elements.length > 0 ? JSON.stringify(editor.elements) : workflow.nodes;
  const triggerType = inferTriggerType(liveNodesJson, workflow.type);

  return (
    <div className="flex flex-col h-full">
      <EditorShellHeader
        workflow={workflow}
        projectName={projectName}
        dirty={dirty}
        triggerType={triggerType}
        statusUpdating={statusUpdating}
        onBack={handleBack}
        onReusableToggle={handleReusableToggle}
        onStatusChange={handleStatusChange}
      />
      <div className="flex-1 overflow-hidden">
        <EditorCanvas workflow={workflow} onSaveRef={saveRef} initialRunId={initialRunId} />
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
