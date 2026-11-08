"use client";

import { Download, History, Braces, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center gap-2 p-2 border-b">
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Save className="h-3.5 w-3.5 mr-1" />
        {saving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" variant="outline" onClick={onTest} disabled={running || nodeCount === 0}>
        <Play className="h-3.5 w-3.5 mr-1" />
        {running ? "Testing..." : "Test"}
      </Button>
      <Button size="sm" variant="outline" onClick={onExport} disabled={nodeCount === 0}>
        <Download className="h-3.5 w-3.5 mr-1" />
        Export
      </Button>
      <Button size="sm" variant="outline" onClick={onVariables}>
        <Braces className="h-3.5 w-3.5 mr-1" />
        Variables
      </Button>
      <Button size="sm" variant="outline" onClick={onVersions}>
        <History className="h-3.5 w-3.5 mr-1" />
        Versions
      </Button>
    </div>
  );
}
