"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";

interface VariableRow {
  key: string;
  value: string;
}

export function WorkflowVariablesDrawer({
  workflowId,
  variables,
  onSaved,
}: {
  workflowId: string;
  variables: Record<string, string>;
  onSaved: (variables: Record<string, string>) => void;
}) {
  const { request } = useApi();
  const [rows, setRows] = useState<VariableRow[]>(() =>
    Object.entries(variables).map(([key, value]) => ({ key, value })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (index: number, patch: Partial<VariableRow>) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const save = async () => {
    const next: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key) next[key] = row.value;
    }

    setSaving(true);
    setError(null);
    try {
      await request({
        endpoint: `/api/workflows/${workflowId}`,
        method: "PUT",
        data: { variables: next },
      });
      onSaved(next);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not save variables.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 px-4 pb-4">
      <p className="text-xs text-muted-foreground">
        Reference these values from any node with{" "}
        <code className="bg-muted px-1 rounded">{"{{workflow.variableName}}"}</code>.
      </p>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No variables yet. Add one for a channel, repo, branch or any repeated value.
        </p>
      )}

      {rows.map((row, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`variable-key-${index}`} className="text-[10px]">
              Name
            </Label>
            <Input
              id={`variable-key-${index}`}
              className="h-8 text-xs font-mono"
              placeholder="discordChannel"
              value={row.key}
              onChange={(event) => updateRow(index, { key: event.target.value })}
            />
          </div>
          <div className="flex-[2] space-y-1">
            <Label htmlFor={`variable-value-${index}`} className="text-[10px]">
              Value
            </Label>
            <Input
              id={`variable-value-${index}`}
              className="h-8 text-xs font-mono"
              placeholder="1234567890123456789"
              value={row.value}
              onChange={(event) => updateRow(index, { value: event.target.value })}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove variable ${row.key || index + 1}`}
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setRows((current) => [...current, { key: "", value: "" }])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add variable
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving..." : "Save variables"}
        </Button>
      </div>
    </div>
  );
}
