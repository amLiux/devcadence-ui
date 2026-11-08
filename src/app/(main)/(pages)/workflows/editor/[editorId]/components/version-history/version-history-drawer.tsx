"use client";

import { CustomModal } from "@/components/composed/custom-modal";
import { VersionHistoryPanel } from "./version-history-panel";
import type { VersionHistoryPanelProps } from "./types";

/** Opens the version history in the shared drawer, matching the rest of the app. */
export function VersionHistoryDrawer(props: VersionHistoryPanelProps) {
  return (
    <CustomModal
      title="Version history"
      subheading="Each save stores the state it replaced. Compare any version with the current canvas."
    >
      <VersionHistoryPanel {...props} />
    </CustomModal>
  );
}
