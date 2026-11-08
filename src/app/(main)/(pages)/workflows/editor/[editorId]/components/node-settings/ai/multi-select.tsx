"use client";

import { Label } from "@/components/ui/label";

export function MultiSelect({
  label,
  items,
  selectedIds,
  onChange,
}: {
  label: string;
  items: { id: string; name: string; description: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">None created yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                selectedIds.includes(item.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
