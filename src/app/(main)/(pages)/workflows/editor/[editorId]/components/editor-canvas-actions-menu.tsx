"use client";

import { Braces, Download, History, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EditorCanvasActionsMenu({
  nodeCount,
  onExport,
  onVersions,
  onVariables,
}: {
  nodeCount: number;
  onExport: () => void;
  onVersions: () => void;
  onVariables: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            aria-label="More workflow actions"
            title="More workflow actions"
          />
        }
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onExport} disabled={nodeCount === 0}>
          <Download className="h-3.5 w-3.5" />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onVariables}>
          <Braces className="h-3.5 w-3.5" />
          Variables
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onVersions}>
          <History className="h-3.5 w-3.5" />
          Versions
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
