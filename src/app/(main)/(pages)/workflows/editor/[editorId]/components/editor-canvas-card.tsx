"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, Zap, Settings, Trash2, Pencil, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-5 w-5 text-yellow-500" />,
  Action: <Settings className="h-5 w-5 text-blue-500" />,
  GitHub: <GitBranch className="h-5 w-5 text-foreground" />,
};

interface CardData {
  title: string;
  description: string;
  type: string;
  completed: boolean;
  current: boolean;
}

function EditorCanvasCardInner({ data, id }: NodeProps) {
  const { title, description, type, completed, current } = data as CardData;
  const isConditional = title === "Conditional";

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch a custom event that the canvas listens to
    window.dispatchEvent(new CustomEvent("node:edit", { detail: { nodeId: id } }));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("node:delete", { detail: { nodeId: id } }));
  };

  const handleTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("node:test", { detail: { nodeId: id } }));
  };

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      <div
        className={`rounded-lg border bg-background p-3 shadow-sm min-w-[200px] ${
          isConditional
            ? "border-amber-500/60"
            : completed
              ? "border-green-500"
              : current
                ? "border-primary"
                : "border-border"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {iconMap[type] || <Settings className="h-5 w-5 text-muted-foreground" />}
            <span className="font-medium text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleTest}
              className="p-1 rounded hover:bg-green-500/10 text-muted-foreground hover:text-green-600 transition-colors"
              title="Test node"
            >
              <Play className="h-3 w-3" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit settings"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
          <div className="flex items-center gap-1">
            {completed && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {current && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
            <span className="text-[10px] text-muted-foreground font-mono">{id}</span>
          </div>
        </div>
      </div>
      {isConditional ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="success"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-1/4"
          />
          <span className="absolute -bottom-5 left-[25%] -translate-x-1/2 text-[9px] text-green-600 font-medium pointer-events-none select-none">
            Yes
          </span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="failure"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-3/4"
          />
          <span className="absolute -bottom-5 left-[75%] -translate-x-1/2 text-[9px] text-red-600 font-medium pointer-events-none select-none">
            No
          </span>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}
    </div>
  );
}

export const EditorCanvasCard = memo(EditorCanvasCardInner);
