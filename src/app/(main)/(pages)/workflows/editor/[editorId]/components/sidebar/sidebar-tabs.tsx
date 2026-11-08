"use client";

import { History, Settings } from "lucide-react";
import type { SidebarTab } from "@/providers/editor-provider";

const TABS: { id: SidebarTab; label: string; icon: typeof Settings }[] = [
  { id: "actions", label: "Actions", icon: Settings },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "history", label: "History", icon: History },
];

export function SidebarTabs({
  active,
  onChange,
}: {
  active: SidebarTab;
  onChange: (tab: SidebarTab) => void;
}) {
  return (
    <div className="flex border-b">
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <div key={tab.id} className={index === 0 ? "flex-1" : "flex-1 border-l"}>
            <button
              onClick={() => onChange(tab.id)}
              className={`w-full py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                selected
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
