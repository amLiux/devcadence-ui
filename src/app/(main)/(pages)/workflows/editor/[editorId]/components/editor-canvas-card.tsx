"use client";

import React, { memo } from "react";
import Image from "next/image";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  GitBranch,
  Zap,
  Settings,
  Trash2,
  Pencil,
  Play,
  GitFork,
  Database,
  Sparkles,
  ArrowRightLeft,
  LogIn,
  LogOut,
  Mail,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { NodeCardSummary } from "./node-card-summary";
import { NodeHandles } from "./node-handles";
import { useNodeVisualState } from "./use-node-visual-state";

const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-5 w-5 text-yellow-500" />,
  Action: <Settings className="h-5 w-5 text-blue-500" />,
  GitHub: <GitBranch className="h-5 w-5 text-foreground" />,
  Conditional: <GitFork className="h-5 w-5 text-orange-500" />,
  PostgreSQL: <Database className="h-5 w-5 text-blue-600" />,
  AI: <Sparkles className="h-5 w-5 text-purple-500" />,
  "Call Workflow": <ArrowRightLeft className="h-5 w-5 text-emerald-500" />,
  Input: <LogIn className="h-5 w-5 text-cyan-500" />,
  Return: <LogOut className="h-5 w-5 text-amber-500" />,
  SMTP: <Mail className="h-5 w-5 text-red-500" />,
  Slack: <Image src="/slack.png" alt="Slack" width={20} height={20} className="object-contain" />,
  Security: <Shield className="h-5 w-5 text-emerald-500" />,
  "Scan Dependencies": <Shield className="h-5 w-5 text-emerald-500" />,
  Discord: <Image src="/discord.png" alt="Discord" width={20} height={20} className="object-contain" />,
  "Send Discord Message": (
    <Image src="/discord.png" alt="Discord" width={20} height={20} className="object-contain" />
  ),
  "Read Discord Messages": (
    <Image src="/discord.png" alt="Discord" width={20} height={20} className="object-contain" />
  ),
  "Send Direct Message": (
    <Image src="/discord.png" alt="Discord" width={20} height={20} className="object-contain" />
  ),
};

interface CardData {
  title: string;
  description: string;
  type: string;
  completed: boolean;
  current: boolean;
  metadata?: Record<string, string>;
}

function EditorCanvasCardInner({ data, id }: NodeProps) {
  const { title, description, type, metadata } = data as CardData;
  const visual = useNodeVisualState({ id, title, type, metadata });

  const dispatchNodeEvent = (event: string) => (mouseEvent: React.MouseEvent) => {
    mouseEvent.stopPropagation();
    window.dispatchEvent(new CustomEvent(event, { detail: { nodeId: id } }));
  };

  return (
    <div className="relative group">
      {!visual.isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}
      <div
        className={`rounded-lg border bg-background p-3 shadow-sm w-fit min-w-[220px] max-w-[300px] transition-all duration-200 ${visual.borderClass}`}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {iconMap[title] || iconMap[type] || (
              <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={dispatchNodeEvent("node:test")}
                    disabled={!visual.canTest}
                    className={`p-1 rounded transition-colors ${
                      visual.canTest
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
                  {visual.canTest
                    ? "Test node"
                    : `Run "${visual.parentNames}" first to test this node`}
                </p>
              </TooltipContent>
            </Tooltip>
            <button
              onClick={dispatchNodeEvent("node:edit")}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit settings"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={dispatchNodeEvent("node:delete")}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete node"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <NodeCardSummary summary={visual.summary} description={description} />
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {type}
          </Badge>
          <div className="flex items-center gap-1">
            {visual.testSuccess && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {visual.testFailed && <div className="h-2 w-2 rounded-full bg-red-500" />}
            <span className="text-[10px] text-muted-foreground font-mono">{id}</span>
          </div>
        </div>
      </div>
      <NodeHandles isConditional={visual.isConditional} />
    </div>
  );
}

export const EditorCanvasCard = memo(EditorCanvasCardInner);
