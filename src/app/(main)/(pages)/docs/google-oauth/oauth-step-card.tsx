"use client";

import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OAuthSetupStepId } from "./use-oauth-checklist";

export interface OAuthGuideStep {
  id: OAuthSetupStepId;
  title: string;
  body: string;
  code?: string;
}

export function OAuthStepCard({
  step,
  index,
  checked,
  onToggle,
}: {
  step: OAuthGuideStep;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition-colors",
        checked ? "ring-1 ring-emerald-500/50" : undefined,
      )}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium tabular-nums transition-colors",
              checked
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-border text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {checked ? <Check className="h-3 w-3" /> : index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.body}</p>
            {step.code && (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] leading-relaxed">
                <code>{step.code}</code>
              </pre>
            )}
          </div>

          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={`Mark step ${index + 1} as done`}
            onClick={onToggle}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded text-[10px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                checked
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-input bg-transparent",
              )}
              aria-hidden="true"
            >
              {checked && <Check className="h-3 w-3" />}
            </span>
            Done
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
