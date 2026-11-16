"use client";

import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BrandMark } from "./brand-mark";
import { RunLogPreview } from "./run-log-preview";

export function BrandPanel() {
  return (
    <section className="relative hidden flex-col overflow-hidden border-r border-border bg-muted/20 p-10 lg:flex">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-mono text-sm lowercase tracking-tight">devcadence</p>
            <p className="font-mono text-[11px] text-muted-foreground">self-hosted runner</p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">v0.1.0</span>
      </header>

      <div className="mt-20 w-full max-w-md space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          in your workspace
        </p>

        <Card size="sm" className="bg-card/80">
          <div className="flex items-center gap-3 px-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
              <Clock className="size-4 text-yellow-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">nightly-digest</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge className="gap-0.5 px-1.5 py-0 text-[10px]">Active</Badge>
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  Schedule
                </Badge>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  devcadence-ui
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card size="sm" className="bg-card/80">
          <div className="flex items-center justify-between px-3 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                success
              </span>
              <span className="font-medium">run #4821</span>
            </div>
            <span className="text-muted-foreground">2.8s</span>
          </div>
          <div className="px-2">
            <RunLogPreview />
          </div>
        </Card>
      </div>

      <footer className="mt-auto flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>self-hosted · no telemetry</span>
        <span>workflow automation</span>
      </footer>
    </section>
  );
}
