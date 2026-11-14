"use client";

import { Button } from "@/components/ui/button";

export function ConnectionFormActions({
  submitting,
  editing,
  canSubmit,
  onSubmit,
  onClose,
}: {
  submitting: boolean;
  editing: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const label = submitting ? (editing ? "Saving..." : "Connecting...") : editing ? "Save" : "Connect";

  return (
    <div className="flex justify-end gap-2 pb-4">
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={submitting || !canSubmit}>
        {label}
      </Button>
    </div>
  );
}
