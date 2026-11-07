"use client";

import React, { useMemo } from "react";
import { AlignLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { JsonEditor } from "@/components/ui/json-editor";
import { formatTemplateJson, formatTemplateJsonError, validateTemplateJson } from "@/lib/json-input";

/**
 * JSON editor field with template-aware validation and formatting.
 * The error is derived from the value, so it can never go stale after the
 * parent changes the draft.
 */
export function JsonField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 80,
  hint,
  actions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const error = useMemo(() => {
    const result = validateTemplateJson(value);
    return result ? formatTemplateJsonError(result) : null;
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => onChange(formatTemplateJson(value))}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <AlignLeft className="h-3 w-3" />
            Format
          </button>
        </div>
      </div>
      <JsonEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        error={error}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
