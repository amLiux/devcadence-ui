"use client";

import { ChevronDown } from "lucide-react";
import { DraggableCard } from "./draggable-card";
import type { NodeCardDef } from "./node-catalog";

export function NodeCategorySection({
  label,
  nodes,
  expanded,
  onToggle,
}: {
  label: string;
  nodes: NodeCardDef[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (nodes.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`} />
      </button>
      {expanded && (
        <div className="space-y-1">
          {nodes.map((node) => (
            <DraggableCard key={node.title} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}
