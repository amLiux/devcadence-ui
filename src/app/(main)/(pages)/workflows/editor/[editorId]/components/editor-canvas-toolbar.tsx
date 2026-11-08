"use client";

import { Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorCanvasActionsMenu } from "./editor-canvas-actions-menu";

export function EditorCanvasToolbar({
  saving,
  running,
  nodeCount,
  onSave,
  onTest,
  onExport,
  onVersions,
  onVariables,
}: {
  saving: boolean;
  running: boolean;
  nodeCount: number;
  onSave: () => void;
  onTest: () => void;
  onExport: () => void;
  onVersions: () => void;
  onVariables: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Workflow actions"
      className="flex flex-wrap items-center gap-2 border-b p-2"
    >
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save className="h-3.5 w-3.5" />
        {saving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={onTest} disabled={running || nodeCount === 0}>
        <Play className="h-3.5 w-3.5" />
        {running ? "Testing..." : "Test"}
      </Button>
      <div className="ml-auto">
        <EditorCanvasActionsMenu
          nodeCount={nodeCount}
          onExport={onExport}
          onVersions={onVersions}
          onVariables={onVariables}
        />
      </div>
    </div>
  );
}
