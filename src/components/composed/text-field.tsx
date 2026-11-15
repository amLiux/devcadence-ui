"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + input + hint with the compact settings sizing.
 * Keeps node settings to one line per field instead of eight.
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  optional,
  type = "text",
  inputClassName,
  id,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  optional?: boolean;
  type?: "text" | "password" | "email" | "url";
  inputClassName?: string;
  id?: string;
}) {
  const inputId =
    id ??
    (typeof label === "string" ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-xs">
        {label}
        {optional && (
          <span className="ml-1 text-[10px] text-muted-foreground">(optional)</span>
        )}
      </Label>
      <Input
        id={inputId}
        type={type}
        className={cn("h-8 text-xs", inputClassName)}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
