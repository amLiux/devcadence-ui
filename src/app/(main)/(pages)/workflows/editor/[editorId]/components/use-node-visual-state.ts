"use client";

import { useMemo } from "react";
import { useEditor } from "@/providers/editor-provider";
import { buildParentMap } from "@/lib/workflow-context";
import { summarizeNode } from "@/lib/workflows/node-summary";
import type { WorkflowContext } from "@/lib/types";

function parentsTested(
  parentIds: string[],
  context: WorkflowContext,
): boolean {
  if (parentIds.length === 0) return true;
  return parentIds.every((id) => {
    const nodeContext = context[id];
    return Boolean(nodeContext && nodeContext.output !== null && nodeContext.success);
  });
}

function borderFor(testSuccess: boolean, testFailed: boolean, isConditional: boolean): string {
  if (testSuccess) return "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  if (testFailed) return "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  if (isConditional) return "border-amber-500/60";
  return "border-border";
}

export function useNodeVisualState({
  id,
  title,
  type,
  metadata,
}: {
  id: string;
  title: string;
  type: string;
  metadata?: Record<string, string>;
}) {
  const { editor, workflowNames } = useEditor();

  const summary = useMemo(
    () => summarizeNode(metadata, title, { workflowNames }),
    [metadata, title, workflowNames],
  );
  const parentMap = useMemo(() => buildParentMap(editor.edges), [editor.edges]);
  const parentIds = useMemo(() => parentMap.get(id) || [], [parentMap, id]);

  const canTest = parentsTested(parentIds, editor.context);
  const nodeContext = editor.context[id];
  const isTested = nodeContext ? nodeContext.output !== null : false;
  const testSuccess = isTested && Boolean(nodeContext?.success);
  const testFailed = isTested && !Boolean(nodeContext?.success);
  const parentNames = useMemo(
    () => parentIds.map((parentId) => editor.context[parentId]?.name ?? parentId).join(", "),
    [parentIds, editor.context],
  );

  const isConditional = title === "Conditional";
  const borderClass = borderFor(testSuccess, testFailed, isConditional);

  return {
    summary,
    canTest,
    testSuccess,
    testFailed,
    parentNames,
    borderClass,
    isConditional,
    isTrigger: type === "Trigger",
  };
}
