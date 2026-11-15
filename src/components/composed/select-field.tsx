"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Native select with the compact settings styling used by node settings. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  optional,
  className,
  id,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  id?: string;
}) {
  const selectId =
    id ??
    (typeof label === "string" ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId} className="text-xs">
        {label}
        {optional && (
          <span className="ml-1 text-[10px] text-muted-foreground">(optional)</span>
        )}
      </Label>
      <select
        id={selectId}
        className={cn(
          "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
