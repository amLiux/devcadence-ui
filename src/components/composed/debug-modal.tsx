"use client";

import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Info, AlertTriangle, Terminal } from "lucide-react";
import type { NodeDebugLog, LogLevel } from "@/lib/types";

const levelConfig: Record<LogLevel, { icon: React.ReactNode; color: string; prefix: string }> = {
  info: {
    icon: <Info className="h-3 w-3 shrink-0" />,
    color: "text-blue-400",
    prefix: "i",
  },
  success: {
    icon: <CheckCircle className="h-3 w-3 shrink-0" />,
    color: "text-green-400",
    prefix: "✓",
  },
  error: {
    icon: <XCircle className="h-3 w-3 shrink-0" />,
    color: "text-red-400",
    prefix: "✗",
  },
  warning: {
    icon: <AlertTriangle className="h-3 w-3 shrink-0" />,
    color: "text-yellow-400",
    prefix: "!",
  },
};

function LogLine({ entry }: { entry: React.ReactNode }) {
  return <div className="leading-relaxed">{entry}</div>;
}

interface DebugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: NodeDebugLog[];
  running?: boolean;
}

export function DebugModal({ open, onOpenChange, title, steps, running }: DebugModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const totalSteps = steps.length;
  const passedSteps = steps.filter((s) => s.success).length;
  const allDone = steps.length > 0 && steps.every((s) => s.logs.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {running
              ? "Running..."
              : allDone
                ? `${passedSteps}/${totalSteps} nodes passed`
                : "Ready"}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="bg-[#0d1117] text-[#c9d1d9] font-mono text-xs p-4 overflow-auto max-h-[60vh] min-h-[200px]"
        >
          {steps.length === 0 && !running && (
            <div className="text-muted-foreground italic">No output yet.</div>
          )}

          {steps.map((step, i) => (
            <div key={step.nodeId} className={i > 0 ? "mt-3" : ""}>
              {/* Node header */}
              <div className="flex items-center gap-2 font-bold">
                <span className="text-muted-foreground">{`[${i + 1}]`}</span>
                <span
                  className={
                    step.success
                      ? "text-green-400"
                      : step.logs.length > 0
                        ? "text-red-400"
                        : "text-muted-foreground"
                  }
                >
                  {step.title}
                </span>
                {step.logs.length > 0 && (
                  <span className={step.success ? "text-green-400/60" : "text-red-400/60"}>
                    {step.success ? "✓" : "✗"}
                  </span>
                )}
              </div>

              {/* Logs (indented) */}
              <div className="ml-5 border-l border-muted pl-3 mt-1 space-y-0.5">
                {step.logs.map((entry, j) => {
                  const cfg = levelConfig[entry.type];
                  return (
                    <LogLine
                      key={j}
                      entry={
                        <span className="flex items-start gap-1.5">
                          <span className={`${cfg.color} mt-px shrink-0`}>{cfg.prefix}</span>
                          <span className="text-muted-foreground text-[10px] shrink-0 mt-px">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={cfg.color}>{entry.message}</span>
                        </span>
                      }
                    />
                  );
                })}
                {step.logs.length === 0 && running && (
                  <LogLine
                    entry={
                      <span className="text-muted-foreground animate-pulse">executing...</span>
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end px-4 py-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
