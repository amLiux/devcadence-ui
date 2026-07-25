"use client";

import React, { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, Zap, Settings, Trash2, Pencil, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEditor } from "@/providers/editor-provider";
import { buildParentMap } from "@/lib/workflow-context";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  const { title, description, type } = data as CardData;
  const { editor } = useEditor();
  const isConditional = title === "Conditional";

  const parentMap = useMemo(() => buildParentMap(editor.edges), [editor.edges]);
  const parentIds = useMemo(() => parentMap.get(id) || [], [parentMap, id]);

  const allParentsTested =
    parentIds.length === 0 ||
    parentIds.every((pid) => {
      const ctx = editor.context[pid];
      return ctx && ctx.output !== null && ctx.success;
    });

  const nodeCtx = editor.context[id];
  const isTested = nodeCtx ? nodeCtx.output !== null : false;
  const testSuccess = isTested && (nodeCtx?.success ?? false);
  const testFailed = isTested && !(nodeCtx?.success ?? false);

  const parentNames = useMemo(
    () => parentIds.map((pid) => editor.context[pid]?.name ?? pid).join(", "),
    [parentIds, editor.context],
  );

  let borderClass = "border-border";
  if (testSuccess) borderClass = "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  else if (testFailed) borderClass = "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  else if (isConditional) borderClass = "border-amber-500/60";

  const canTest = allParentsTested;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
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
        className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-200 ${borderClass}`}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {iconMap[type] || <Settings className="h-5 w-5 text-muted-foreground shrink-0" />}
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={handleTest}
                    disabled={!canTest}
                    className={`p-1 rounded transition-colors ${
                      canTest
                        ? "hover:bg-green-500/10 text-muted-foreground hover:text-green-600"
                        : "text-muted-foreground/30 cursor-not-allowed"
                    }`}
                  />
                }
              >
                <Play className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {canTest ? "Test node" : `Run "${parentNames}" first to test this node`}
                </p>
              </TooltipContent>
            </Tooltip>
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
            {testSuccess && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {testFailed && <div className="h-2 w-2 rounded-full bg-red-500" />}
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
