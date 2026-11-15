"use client";

import { Label } from "@/components/ui/label";
import { TextField } from "@/components/composed/text-field";
import { toString as cronToString } from "cronstrue";
import type { NodeSettingsProps } from "../types";
import { GoogleConnectionSelect } from "../google/connection-select";

export function WatchEmailsSettings({ meta, handleChange }: NodeSettingsProps) {
  let cronPreview = "";
  if (meta.cron) {
    try {
      cronPreview = cronToString(meta.cron);
    } catch {
      cronPreview = "Invalid cron expression";
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Google Connection</Label>
        <GoogleConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      <TextField
        label="Gmail query"
        value={meta.query || ""}
        onChange={(value) => handleChange("query", value)}
        placeholder="is:unread label:inbox"
      />
      <TextField
        label="Cron Expression"
        value={meta.cron || ""}
        onChange={(value) => handleChange("cron", value)}
        placeholder="*/5 * * * *"
        hint={cronPreview || undefined}
      />
      <TextField
        label="Max results per poll"
        value={meta.maxResults || ""}
        onChange={(value) => handleChange("maxResults", value)}
        placeholder="25"
        hint="1-50."
      />
      <p className="text-[10px] text-muted-foreground">
        Activate the workflow to start polling. The first poll only records the newest matching
        message, so enabling it does not replay old mail. Output:{" "}
        <code className="bg-muted px-1 rounded">emails</code>.
      </p>
    </div>
  );
}
