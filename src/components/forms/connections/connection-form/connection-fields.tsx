"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InputConfig } from "@/lib/types";

export function ConnectionFields({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  inputs,
  values,
  compact,
  getFieldState,
  hasStoredSecret,
  onInputChange,
  onTouch,
}: {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  inputs: InputConfig[];
  values: Record<string, string>;
  compact: boolean;
  getFieldState: (input: InputConfig) => {
    missing: boolean;
    requirement: "required" | "optional";
  };
  hasStoredSecret: (key: string) => boolean;
  onInputChange: (key: string, value: string) => void;
  onTouch: (key: string) => void;
}) {
  return (
    <div className={compact ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="My Connection"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          type="text"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Optional description"
        />
      </div>
      {inputs.map((input) => {
        const { key, type, label, options, placeholder, hint } = input;
        const { requirement } = getFieldState(input);
        return (
          <div
            key={key}
            className={`space-y-2 ${!compact && type === "select" ? "md:col-span-2" : ""}`}
          >
            <Label htmlFor={key}>
              {label || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              {requirement === "required" && (
                <span className="text-destructive ml-0.5">*</span>
              )}
              {requirement === "optional" && (
                <span className="text-muted-foreground ml-1 text-[10px]">(optional)</span>
              )}
            </Label>
            {type === "select" && options ? (
              <select
                id={key}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={values[key] ?? ""}
                onChange={(event) => onInputChange(key, event.target.value)}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={key}
                type={type}
                value={values[key] ?? ""}
                onChange={(event) => onInputChange(key, event.target.value)}
                onFocus={() => onTouch(key)}
                placeholder={
                  placeholder ??
                  (type === "password"
                    ? hasStoredSecret(key)
                      ? "Saved — leave blank to keep"
                      : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    : "")
                }
              />
            )}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
