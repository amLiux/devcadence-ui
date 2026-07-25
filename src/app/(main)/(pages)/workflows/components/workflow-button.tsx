"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/providers/modal-provider";
import { CustomModal } from "@/components/composed/custom-modal";
import { WorkflowForm } from "@/components/forms/workflow-form";

export function WorkflowButton() {
  const { setOpen } = useModal();

  return (
    <Button
      onClick={() =>
        setOpen(
          <CustomModal
            title="New Workflow"
            subheading="Create a new workflow to automate your tasks."
          >
            <WorkflowForm />
          </CustomModal>,
        )
      }
    >
      <Plus className="mr-2 h-4 w-4" />
      New Workflow
    </Button>
  );
}
