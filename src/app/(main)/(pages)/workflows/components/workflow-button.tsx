"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/providers/modal-provider";
import { CustomModal } from "@/components/composed/custom-modal";
import { WorkflowForm } from "@/components/forms/workflow-form";
import type { Project } from "@/lib/types";

interface Props {
  projects?: Project[];
  defaultProjectId?: string;
}

export function WorkflowButton({ projects, defaultProjectId }: Props = {}) {
  const { setOpen } = useModal();

  return (
    <Button
      onClick={() =>
        setOpen(
          <CustomModal
            title="New Workflow"
            subheading="Create a new workflow to automate your tasks."
          >
            <WorkflowForm projects={projects} defaultProjectId={defaultProjectId} />
          </CustomModal>,
        )
      }
    >
      <Plus className="mr-2 h-4 w-4" />
      New Workflow
    </Button>
  );
}
