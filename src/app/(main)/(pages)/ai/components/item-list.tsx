"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import type { NamedItem } from "@/lib/types";

export function ItemList<T extends NamedItem>({
  items,
  selected,
  onSelect,
  onDelete,
}: {
  items: T[];
  selected: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">No items yet. Create one!</p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
            selected === item.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"
          }`}
          onClick={() => onSelect(item.id)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.description && <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>}
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
