import type { Connection, EditorNodeData } from "@/lib/types";

export type NodeCategory = "Communication" | "Repository" | "Data" | "AI" | "Core" | "Security";

export interface NodeCardDef {
  type: EditorNodeData["type"];
  title: string;
  description: string;
  requiresConnection?: Connection["type"];
  category?: NodeCategory;
}

export const MAX_EXPANDED_CATEGORIES = 2;

export const categoryOrder: NodeCategory[] = [
  "Communication",
  "Repository",
  "Data",
  "AI",
  "Core",
  "Security",
];

export const categoryLabels: Record<NodeCategory, string> = {
  Communication: "Communication",
  Repository: "Repository",
  Data: "Data",
  AI: "AI",
  Core: "Core",
  Security: "Security",
};

export { iconMap } from "./node-icons";
export { triggerNodes, actionNodes } from "./node-definitions";
