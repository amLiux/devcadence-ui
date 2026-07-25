"use client";

import { ModeToggle } from "@/components/global/mode-toggle";

export default function InfoBar() {
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">devdock</span>
        <span>/</span>
        <span>admin dashboard</span>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
      </div>
    </div>
  );
}
