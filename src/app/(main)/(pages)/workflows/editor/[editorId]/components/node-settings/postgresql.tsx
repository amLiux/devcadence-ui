"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import type { NodeSettingsProps } from "./types";
import type { Connection } from "@/lib/types";

function ConnectionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { request } = useApi();
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    request<Connection[]>({ endpoint: "/api/connections" }).then((data) => {
      if (data) setConnections(data.filter((c) => c.type === "PostgreSQL"));
    });
  }, [request]);

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select connection...</option>
      {connections.map((conn) => (
        <option key={conn.id} value={conn.id}>
          {conn.name}
        </option>
      ))}
    </select>
  );
}

export function PostgresQuerySettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">SQL Query</Label>
        <Textarea className="min-h-[100px] text-xs font-mono" placeholder='SELECT * FROM users WHERE id = $userId' value={meta.sql || ""} onChange={(e) => handleChange("sql", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Parameters (optional, from expression)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="$userId = previousStep.body.userId" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">$paramName</code> in SQL. Set parameter mappings above using <code className="bg-muted px-1 rounded">previousStep</code> expressions.
      </p>
    </div>
  );
}

export function PostgresInsertSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Table</Label>
        <Input className="h-8 text-xs" placeholder="users" value={meta.table || ""} onChange={(e) => handleChange("table", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Columns (comma-separated)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="name, email, role" value={meta.columns || ""} onChange={(e) => handleChange("columns", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Values (comma-separated, use $param for dynamic)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="$name, $email, 'user'" value={meta.values || ""} onChange={(e) => handleChange("values", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Parameter Mapping</Label>
        <Input className="h-8 text-xs font-mono" placeholder="$name = previousStep.body.name" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
    </div>
  );
}

export function PostgresUpdateSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Table</Label>
        <Input className="h-8 text-xs" placeholder="users" value={meta.table || ""} onChange={(e) => handleChange("table", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">SET Clause</Label>
        <Textarea className="min-h-[60px] text-xs font-mono" placeholder='name = $name, email = $email' value={meta.setClause || ""} onChange={(e) => handleChange("setClause", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">WHERE Clause (optional)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="id = $userId" value={meta.whereClause || ""} onChange={(e) => handleChange("whereClause", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Parameter Mapping</Label>
        <Input className="h-8 text-xs font-mono" placeholder="$name = previousStep.body.name" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
    </div>
  );
}

export function PostgresDeleteSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Connection</Label>
        <ConnectionSelect value={meta.connectionId || ""} onChange={(v) => handleChange("connectionId", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Table</Label>
        <Input className="h-8 text-xs" placeholder="users" value={meta.table || ""} onChange={(e) => handleChange("table", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">WHERE Clause (optional, empty = delete all)</Label>
        <Input className="h-8 text-xs font-mono" placeholder="id = $userId" value={meta.whereClause || ""} onChange={(e) => handleChange("whereClause", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Parameter Mapping</Label>
        <Input className="h-8 text-xs font-mono" placeholder="$userId = previousStep.body.userId" value={meta.expression || ""} onChange={(e) => handleChange("expression", e.target.value)} />
      </div>
      <p className="text-[10px] text-destructive">
        Warning: Empty WHERE clause will delete all rows.
      </p>
    </div>
  );
}
