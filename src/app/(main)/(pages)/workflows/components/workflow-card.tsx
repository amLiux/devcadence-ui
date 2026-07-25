"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitBranch, Webhook, Clock, Hand, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DebugModal } from "@/components/composed/debug-modal";
import { inferTriggerType, TRIGGER_TYPE_LABELS, type WorkflowTriggerType } from "@/lib/types";
import type { Workflow, NodeDebugLog } from "@/lib/types";

const triggerIcons: Record<WorkflowTriggerType, React.ReactNode> = {
  webhook: <Webhook className="h-5 w-5" />,
  schedule: <Clock className="h-5 w-5" />,
  github: <GitBranch className="h-5 w-5" />,
  manual: <Hand className="h-5 w-5" />,
};

const triggerColors: Record<WorkflowTriggerType, string> = {
  webhook: "text-blue-500",
  schedule: "text-yellow-500",
  github: "text-foreground",
  manual: "text-muted-foreground",
};

interface Props {
  workflow: Workflow;
  onDelete: (id: string) => void;
}

export function WorkflowCard({ workflow, onDelete }: Props) {
  const triggerType = inferTriggerType(workflow.nodes);
  const [testing, setTesting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<NodeDebugLog[]>([]);

  const handleTest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTesting(true);
    setDebugSteps([]);
    setDebugOpen(true);

    try {
      const res = await fetch("/api/workflows/test-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      });
      const result = await res.json();

      if (result.steps) {
        setDebugSteps(result.steps);
      } else {
        setDebugSteps([
          {
            nodeId: "error",
            title: "Workflow",
            success: false,
            logs: [
              {
                type: "error",
                message: result.error || result.message || "Unknown error",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
      }
    } catch {
      setDebugSteps([
        {
          nodeId: "error",
          title: "Workflow",
          success: false,
          logs: [
            {
              type: "error",
              message: "Request failed",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Link href={`/workflows/editor/${workflow.id}`}>
        <Card className="relative group overflow-hidden hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <span className={triggerColors[triggerType]}>{triggerIcons[triggerType]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{workflow.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge
                  variant={workflow.publish ? "default" : "secondary"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {workflow.publish ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {TRIGGER_TYPE_LABELS[triggerType]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {workflow.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {workflow.description}
              </p>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 h-8 px-2 text-xs"
                disabled={testing}
                onClick={handleTest}
              >
                <Play className="h-3 w-3 mr-1" />
                {testing ? "Testing..." : "Test"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-8 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(workflow.id);
                }}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
      <DebugModal
        open={debugOpen}
        onOpenChange={setDebugOpen}
        title={`Test: ${workflow.name}`}
        steps={debugSteps}
        running={testing}
      />
    </>
  );
}
