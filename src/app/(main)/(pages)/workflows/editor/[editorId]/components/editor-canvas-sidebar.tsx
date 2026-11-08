"use client";

import { useEditor } from "@/providers/editor-provider";
import { ExecutionHistory } from "./execution-history";
import { DraggableCard } from "./sidebar/draggable-card";
import { NodeCategorySection } from "./sidebar/node-category-section";
import { NodeSettingsForm } from "./sidebar/node-settings-form";
import { SidebarTabs } from "./sidebar/sidebar-tabs";
import { categoryLabels, categoryOrder } from "./sidebar/node-catalog";
import { useNodeCatalog } from "./sidebar/use-node-catalog";

export function EditorCanvasSidebar({
  workflowId,
  projectId,
  initialRunId,
  workflowVariables,
}: {
  workflowId?: string;
  projectId?: string;
  initialRunId?: string | null;
  workflowVariables?: Record<string, string>;
}) {
  const { editor, sidebarTab, setSidebarTab } = useEditor();
  const hasNodes = editor.elements.length > 0;
  const catalog = useNodeCatalog(hasNodes);

  return (
    <div className="h-full flex flex-col">
      <SidebarTabs active={sidebarTab} onChange={setSidebarTab} />

      {sidebarTab === "actions" && (
        <div className="p-2 space-y-2 flex-1 overflow-auto">
          {!hasNodes && catalog.availableTriggerNodes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Triggers
              </p>
              {catalog.availableTriggerNodes.map((node) => (
                <DraggableCard key={node.title} node={node} />
              ))}
            </div>
          )}
          {categoryOrder.map((category) => (
            <NodeCategorySection
              key={category}
              label={categoryLabels[category]}
              nodes={catalog.groupedActions[category] ?? []}
              expanded={catalog.expandedCategories.has(category)}
              onToggle={() => catalog.toggleCategory(category)}
            />
          ))}
        </div>
      )}

      {sidebarTab === "settings" && (
        <div className="p-2 flex-1 overflow-auto">
          {editor.selectedNode ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium">{editor.selectedNode.data.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {editor.selectedNode.data.description}
                </p>
              </div>
              <NodeSettingsForm
                currentProjectId={projectId}
                workflowVariables={workflowVariables}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click a node on the canvas to configure it.
            </p>
          )}
        </div>
      )}

      {sidebarTab === "history" && workflowId && (
        <ExecutionHistory workflowId={workflowId} initialRunId={initialRunId} />
      )}
    </div>
  );
}
