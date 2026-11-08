"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function WorkflowDefaultsToggle({
  label = "Use workflow defaults",
  available,
  enabled,
  onChange,
}: {
  label?: string;
  available: boolean;
  enabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (!available) return null;

  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}
