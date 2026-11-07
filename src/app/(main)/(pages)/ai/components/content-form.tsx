"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AIContent } from "@/lib/types";

export function ContentForm({
  item,
  onChange,
  label,
}: {
  item: Partial<AIContent>;
  onChange: (data: Partial<AIContent>) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder={`e.g. ${label} 1`}
          value={item.name || ""}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder={`Enter ${label.toLowerCase()} content...`}
          value={item.content || ""}
          onChange={(e) => onChange({ ...item, content: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder={`What this ${label.toLowerCase()} contains`}
          value={item.description || ""}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </div>
    </div>
  );
}
