"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function UploadFileSettings({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
}: NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }) {
  return (
    <GoogleSettingsShell
      meta={meta}
      handleChange={handleChange}
      parentOutput={parentOutput}
      hasParentEdge={hasParentEdge}
    >
      <div className="space-y-1.5">
        <Label className="text-xs">File name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="report-{{previousStep.date}}.csv"
          value={meta.fileName || ""}
          onChange={(event) => handleChange("fileName", event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          className="min-h-20 text-xs"
          placeholder="{{previousStep.csv}}"
          value={meta.content || ""}
          onChange={(event) => handleChange("content", event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">MIME type</Label>
          <Input
            className="h-8 text-xs"
            placeholder="text/csv"
            value={meta.mimeType || ""}
            onChange={(event) => handleChange("mimeType", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Folder ID (optional)</Label>
          <Input
            className="h-8 text-xs"
            value={meta.folderId || ""}
            onChange={(event) => handleChange("folderId", event.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Convert to Google Doc</span>
        <Switch
          checked={meta.convertToGoogleDoc === "true"}
          onCheckedChange={(checked) => handleChange("convertToGoogleDoc", String(checked))}
        />
      </label>
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">file</code> with id, name and webViewLink.
      </p>
    </GoogleSettingsShell>
  );
}
