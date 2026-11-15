"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JsonField } from "@/components/composed/json-field";
import { TextField } from "@/components/composed/text-field";
import {
  isInputMappingObject,
  readInputMapping,
  setInputMappingValue,
  type InputField,
} from "@/lib/workflows/input-contract";

export function CallWorkflowInputs({
  workflowId,
  fields,
  loading,
  error,
  value,
  onChange,
  onRefresh,
}: {
  workflowId: string;
  fields: InputField[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const invalidJson = !isInputMappingObject(value);
  const advanced = showJson || invalidJson || fields.length === 0;
  const mapping = readInputMapping(value);

  if (!workflowId) {
    return (
      <p className="text-[10px] text-muted-foreground">
        Select a target workflow to load its inputs.
      </p>
    );
  }

  if (loading) {
    return <p className="text-[10px] text-muted-foreground">Loading target inputs...</p>;
  }

  if (error) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] text-destructive">{error}</p>
        <Button variant="outline" size="xs" onClick={onRefresh}>
          Retry
        </Button>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">
          This workflow has no Input node. Pass values as JSON; they are available as{" "}
          <code className="bg-muted px-1 rounded">{"{{input.*}}"}</code>.
        </p>
        <JsonField
          label="Input (JSON)"
          value={value || "{}"}
          onChange={onChange}
          placeholder={'{"key": "value"}'}
          minHeight={80}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Inputs</span>
        {!invalidJson && (
          <Button variant="ghost" size="xs" onClick={() => setShowJson((current) => !current)}>
            {showJson ? "Use fields" : "Advanced JSON"}
          </Button>
        )}
      </div>

      {invalidJson && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-destructive">
            The mapping is not a JSON object. Fix it below or start over from the fields.
          </p>
          <Button variant="outline" size="xs" onClick={() => onChange("{}")}>
            Reset to fields
          </Button>
        </div>
      )}

      {advanced ? (
        <JsonField
          label="Input (JSON)"
          value={value || "{}"}
          onChange={onChange}
          placeholder={'{"key": "value"}'}
          minHeight={80}
          hint={<>Values are passed to the target workflow&apos;s Input node as {"{{input.*}}"}</>}
        />
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <TextField
              key={field.name}
              label={field.name}
              value={mapping[field.name] ?? ""}
              onChange={(next) => onChange(setInputMappingValue(value, field.name, next))}
              placeholder={field.defaultValue || "Value or {{expression}}"}
              inputClassName="font-mono"
              hint={
                <>
                  {`{{input.${field.name}}}`}
                  {field.defaultValue ? " · default applies when empty" : ""}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
