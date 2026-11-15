"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, CalendarClock } from "lucide-react";
import { DateTimePicker } from "./date-time-picker";

export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  placeholder = "{{previousStep.start}}",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  const isExpression = value.includes("{{");
  const [explicitMode, setExplicitMode] = useState<"picker" | "expression" | null>(null);
  const mode: "picker" | "expression" =
    explicitMode ?? (isExpression ? "expression" : "picker");

  const toggleMode = () => {
    if (mode === "picker") {
      setExplicitMode("expression");
      return;
    }
    setExplicitMode("picker");
    if (isExpression) onChange("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <button
          type="button"
          onClick={toggleMode}
          className="inline-flex items-center gap-1 rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
          title={mode === "picker" ? "Use an expression" : "Use the date picker"}
        >
          {mode === "picker" ? (
            <>
              <Code2 className="h-3 w-3" /> expression
            </>
          ) : (
            <>
              <CalendarClock className="h-3 w-3" /> picker
            </>
          )}
        </button>
      </div>

      {mode === "picker" ? (
        <DateTimePicker value={value} onChange={onChange} />
      ) : (
        <Input
          className="h-8 text-xs font-mono"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
