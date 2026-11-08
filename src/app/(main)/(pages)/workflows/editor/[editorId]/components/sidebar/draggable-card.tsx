"use client";

import { GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconMap, type NodeCardDef } from "./node-catalog";

export function DraggableCard({ node }: { node: NodeCardDef }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow-type", node.type);
    event.dataTransfer.setData("application/reactflow-title", node.title);
    event.dataTransfer.setData("application/reactflow-description", node.description);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Card
            size="sm"
            draggable
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors py-1.5"
          >
            <CardContent className="px-2 py-0 flex items-center gap-1.5">
              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                {iconMap[node.title] || iconMap[node.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight truncate">{node.title}</p>
              </div>
            </CardContent>
          </Card>
        }
      />
      <TooltipContent side="left" className="max-w-[200px]">
        <p className="text-xs">{node.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
