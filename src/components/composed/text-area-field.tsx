"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  optional,
  mono,
  className,
  id,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  optional?: boolean;
  mono?: boolean;
  className?: string;
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
      <Textarea
        id={inputId}
        className={cn("min-h-20 text-xs", mono && "font-mono", className)}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
