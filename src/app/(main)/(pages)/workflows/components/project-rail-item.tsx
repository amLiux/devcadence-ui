"use client";

import type { ReactNode } from "react";

export function ProjectRailItem({
  label,
  count,
  active,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </button>
  );
}
