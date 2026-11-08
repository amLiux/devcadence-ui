"use client";

import { CustomModal } from "@/components/composed/custom-modal";
import type { EditorNode, Workflow } from "@/lib/types";
import { VersionHistoryDrawer } from "./version-history";
import { WorkflowVariablesDrawer } from "./workflow-variables-drawer";

export function useEditorDrawers({
  workflow,
  elements,
  edges,
  variables,
  onVariablesSaved,
  setOpen,
  setClose,
}: {
  workflow: Workflow;
  elements: EditorNode[];
  edges: unknown[];
  variables: Record<string, string>;
  onVariablesSaved: (variables: Record<string, string>) => void;
  setOpen: (content: React.ReactNode) => void;
  setClose: () => void;
}) {
  const openVersions = () => {
    setOpen(
      <VersionHistoryDrawer
        workflowId={workflow.id}
        currentNodes={JSON.stringify(elements)}
        currentEdges={JSON.stringify(edges)}
        onRestored={() => window.location.reload()}
      />,
    );
  };

  const openVariables = () => {
    setOpen(
      <CustomModal
        title="Workflow variables"
        subheading="Reuse values across nodes with {{workflow.name}}."
      >
        <WorkflowVariablesDrawer
          workflowId={workflow.id}
          variables={variables}
          onSaved={(next) => {
            onVariablesSaved(next);
            setClose();
          }}
        />
      </CustomModal>,
    );
  };

  return { openVersions, openVariables };
}
