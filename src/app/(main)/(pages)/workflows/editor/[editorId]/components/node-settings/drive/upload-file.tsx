"use client";

import { Switch } from "@/components/ui/switch";
import { SelectField } from "@/components/composed/select-field";
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
      <SelectField
        label="MIME type"
        value={meta.mimeType || ""}
        onChange={(value) => {
          const resetConvert = !canConvertToGoogleDoc(value) && meta.convertToGoogleDoc === "true";
          if (resetConvert && updateMeta) {
            updateMeta({ mimeType: value, convertToGoogleDoc: "false" });
            return;
          }
          handleChange("mimeType", value);
          if (resetConvert) handleChange("convertToGoogleDoc", "false");
        }}
        options={TEXT_MIME_TYPES}
        hint="Text-based formats only. Binary uploads are not supported yet."
      />
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
