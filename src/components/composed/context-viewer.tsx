"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { WorkflowContext } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: WorkflowContext;
}

export function ContextViewer({ open, onOpenChange, context }: Props) {
  const entries = Object.entries(context);
  const testedCount = entries.filter(([, v]) => v.output !== null).length;

  if (entries.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Workflow Context</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            No nodes in the workflow. Add nodes to see the context structure.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Context</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Reference these keys in downstream nodes. Example:{" "}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
            item.{entries[0]?.[0]}.output
          </code>
        </p>
        <div className="flex-1 overflow-auto rounded-lg bg-[#0d1117] p-4">
          <pre className="text-sm font-mono text-[#c9d1d9] whitespace-pre-wrap break-words">
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{entries.length} node(s) in context</span>
          <div className="flex items-center gap-2">
            {testedCount > 0 && (
              <Badge variant="default" className="text-[9px] px-1 py-0">
                {testedCount}/{entries.length} tested
              </Badge>
            )}
            {testedCount < entries.length && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                {entries.length - testedCount} untested
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
