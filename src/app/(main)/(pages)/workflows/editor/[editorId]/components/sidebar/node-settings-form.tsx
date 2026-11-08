"use client";

import { useEditor } from "@/providers/editor-provider";
import { SETTINGS_REGISTRY } from "../node-settings";

export function NodeSettingsForm({ currentProjectId }: { currentProjectId?: string }) {
  const { editor, updateNode, markDirty } = useEditor();
  const node = editor.selectedNode;
  if (!node) return null;

  const { title, metadata } = node.data;
  const meta = (metadata || {}) as Record<string, string>;
  const parentEdge = editor.edges.find((edge) => edge.target === node.id);
  const parentOutput = parentEdge ? (editor.context[parentEdge.source]?.output ?? null) : null;

  const handleChange = (key: string, value: string) => {
    updateNode(node.id, { metadata: { ...meta, [key]: value } });
    markDirty();
  };

  const updateMeta = (patch: Record<string, string>) => {
    updateNode(node.id, { metadata: { ...meta, ...patch } });
    markDirty();
  };

  const SettingsComponent = SETTINGS_REGISTRY[title];
  if (SettingsComponent) {
    return (
      <SettingsComponent
        meta={meta}
        handleChange={handleChange}
        updateMeta={updateMeta}
        parentOutput={parentOutput}
        hasParentEdge={!!parentEdge}
        currentProjectId={currentProjectId}
      />
    );
  }

  return (
    <p className="text-xs text-muted-foreground">No configuration available for this node type.</p>
  );
}
