"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { InheritedDataPanel, InheritedDataPanelDisabled } from "../expression-nodes";
import type { NodeSettingsProps } from "../types";
import { GoogleConnectionSelect } from "./connection-select";

export function GoogleSettingsShell({
  meta,
  handleChange,
  parentOutput,
  hasParentEdge,
  children,
}: NodeSettingsProps & {
  parentOutput?: unknown;
  hasParentEdge?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {hasParentEdge &&
        (parentOutput ? (
          <InheritedDataPanel output={parentOutput} />
        ) : (
          <InheritedDataPanelDisabled />
        ))}
      <div className="space-y-1.5">
        <Label className="text-xs">Google Connection</Label>
        <GoogleConnectionSelect
          value={meta.connectionId || ""}
          onChange={(value) => handleChange("connectionId", value)}
        />
      </div>
      {children}
    </div>
  );
}
