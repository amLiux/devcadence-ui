"use client";

import { BrandMark } from "./brand-mark";
import { WorkspacePreview } from "./workspace-preview";

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

      <WorkspacePreview />

      <footer className="mt-auto flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>self-hosted · no telemetry</span>
        <span>workflow automation</span>
      </footer>
    </section>
  );
}
