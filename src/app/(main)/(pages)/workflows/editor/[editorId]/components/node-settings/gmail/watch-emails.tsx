"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toString as cronToString } from "cronstrue";
import type { NodeSettingsProps } from "../types";
import { GoogleConnectionSelect } from "./connection-select";

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
      <div className="space-y-1.5">
        <Label className="text-xs">Gmail query</Label>
        <Input
          className="h-8 text-xs"
          placeholder="is:unread label:inbox"
          value={meta.query || ""}
          onChange={(event) => handleChange("query", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Cron Expression</Label>
        <Input
          className="h-8 text-xs"
          placeholder="*/5 * * * *"
          value={meta.cron || ""}
          onChange={(event) => handleChange("cron", event.target.value)}
        />
        {cronPreview && <p className="text-[11px] text-muted-foreground">{cronPreview}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Max results per poll (1-50)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="25"
          value={meta.maxResults || ""}
          onChange={(event) => handleChange("maxResults", event.target.value)}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Activate the workflow to start polling. The first poll only records the newest matching
        message, so enabling it does not replay old mail. Output:{" "}
        <code className="bg-muted px-1 rounded">emails</code>.
      </p>
    </div>
  );
}
