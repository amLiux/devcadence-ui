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
        checked ? "bg-emerald-500/10 ring-2 ring-emerald-500/60" : undefined,
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
            <h3 className={cn("text-sm font-semibold", checked && "text-muted-foreground")}>
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground">{step.body}</p>
            {step.code && (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-[11px] leading-relaxed">
                <code>{step.code}</code>
              </pre>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={checked}
              onChange={onToggle}
              aria-label={`Mark step ${index + 1} as done`}
            />
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                checked
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-input bg-transparent",
              )}
              aria-hidden="true"
            >
              {checked && <Check className="h-3 w-3" />}
            </span>
            Done
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
