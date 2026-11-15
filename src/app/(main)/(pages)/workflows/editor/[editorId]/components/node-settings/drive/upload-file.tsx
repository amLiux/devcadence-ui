"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextAreaField } from "@/components/composed/text-area-field";
import { TextField } from "@/components/composed/text-field";
import { TEXT_MIME_TYPES, canConvertToGoogleDoc } from "@/lib/mime-types";
import type { NodeSettingsProps } from "../types";
import { GoogleSettingsShell } from "../google/settings-shell";

export function UploadFileSettings({
  meta,
  handleChange,
  updateMeta,
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
      <TextField
        label="File name"
        value={meta.fileName || ""}
        onChange={(value) => handleChange("fileName", value)}
        placeholder="report-{{previousStep.date}}.csv"
      />
      <TextAreaField
        label="Content"
        value={meta.content || ""}
        onChange={(value) => handleChange("content", value)}
        placeholder="{{previousStep.csv}}"
      />
      <div className="space-y-1.5">
        <Label className="text-xs">MIME type</Label>
        <Select
          value={meta.mimeType || "auto"}
          onValueChange={(selected) => {
            const next = selected ?? "auto";
            const value = next === "auto" ? "" : next;
            const resetConvert =
              !canConvertToGoogleDoc(value) && meta.convertToGoogleDoc === "true";
            if (resetConvert && updateMeta) {
              updateMeta({ mimeType: value, convertToGoogleDoc: "false" });
              return;
            }
            handleChange("mimeType", value);
            if (resetConvert) handleChange("convertToGoogleDoc", "false");
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_MIME_TYPES.map((option) => (
              <SelectItem key={option.value || "auto"} value={option.value || "auto"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Text-based formats only. Binary uploads are not supported yet.
        </p>
      </div>
      <TextField
        label="Folder ID"
        optional
        value={meta.folderId || ""}
        onChange={(value) => handleChange("folderId", value)}
        placeholder="1AbC..."
        hint={
          <>
            From the folder URL: <code className="bg-muted px-1 rounded">drive.google.com/drive/folders/&lt;ID&gt;</code>.
            Leave empty for My Drive. With <code className="bg-muted px-1 rounded">drive.file</code>, folders created
            outside the app may not be visible.
          </>
        }
      />
      {canConvertToGoogleDoc(meta.mimeType) && (
        <label className="flex items-center justify-between gap-2 text-xs">
          <span>Convert to Google Doc</span>
          <Switch
            checked={meta.convertToGoogleDoc === "true"}
            onCheckedChange={(checked) => handleChange("convertToGoogleDoc", String(checked))}
          />
        </label>
      )}
      <p className="text-[10px] text-muted-foreground">
        Output: <code className="bg-muted px-1 rounded">file</code> with id, name and webViewLink.
      </p>
    </GoogleSettingsShell>
  );
}
