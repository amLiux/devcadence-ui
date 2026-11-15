"use client";

import { Check, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OAUTH_SETUP_STEPS, type OAuthSetupStepId } from "./use-oauth-checklist";

export function OAuthSetupChecklist({
  done,
  toggle,
  reset,
  doneCount,
  total,
  allDone,
}: {
  done: Record<string, boolean>;
  toggle: (id: OAuthSetupStepId) => void;
  reset: () => void;
  doneCount: number;
  total: number;
  allDone: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Your setup progress</h2>
            <p className="text-xs text-muted-foreground">
              Track the steps for this instance. It is stored in your browser and does not block the
              docs progress.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {doneCount}/{total}
            </span>
            {doneCount > 0 && (
              <Button variant="ghost" size="xs" onClick={reset} className="gap-1">
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              allDone ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
          />
        </div>

        <ul className="space-y-1.5">
          {OAUTH_SETUP_STEPS.map((step, index) => {
            const checked = Boolean(done[step.id]);
            return (
              <li key={step.id}>
                <label
                  htmlFor={`oauth-step-${step.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 text-xs transition-colors",
                    checked
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <input
                    id={`oauth-step-${step.id}`}
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => toggle(step.id)}
                  />
                  <span
                    className={cn(
                      "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                      checked
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-input bg-transparent",
                    )}
                    aria-hidden="true"
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span
                    className={cn(
                      "mt-px w-4 shrink-0 text-right text-[10px] tabular-nums",
                      checked ? "text-emerald-500" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      checked ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {allDone && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Setup complete. Nodes can use this Google connection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
