"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OAUTH_SETUP_STEPS, useOAuthChecklist } from "./use-oauth-checklist";

export function OAuthSetupChecklist() {
  const { done, toggle, reset, doneCount, total, allDone } = useOAuthChecklist();

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
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
          />
        </div>

        <ul className="space-y-1.5">
          {OAUTH_SETUP_STEPS.map((step) => {
            const checked = Boolean(done[step.id]);
            return (
              <li key={step.id}>
                <label
                  htmlFor={`oauth-step-${step.id}`}
                  className="flex cursor-pointer items-start gap-2 text-xs"
                >
                  <input
                    id={`oauth-step-${step.id}`}
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    onChange={() => toggle(step.id)}
                  />
                  <span className={checked ? "text-muted-foreground line-through" : ""}>
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
