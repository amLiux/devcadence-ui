"use client";

import { useEffect, useMemo, useState } from "react";
import type { Connection } from "@/lib/types";
import {
  MAX_EXPANDED_CATEGORIES,
  actionNodes,
  triggerNodes,
  type NodeCardDef,
  type NodeCategory,
} from "./node-catalog";

export function useNodeCatalog(hasNodes: boolean) {
  const [configuredTypes, setConfiguredTypes] = useState<Set<Connection["type"]>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(["Communication"]),
  );

  useEffect(() => {
    fetch("/api/connections")
      .then((response) => response.json())
      .then((connections: Connection[]) => {
        setConfiguredTypes(new Set(connections.map((connection) => connection.type)));
      })
      .catch(() => {});
  }, []);

  const isAvailable = (node: NodeCardDef) =>
    !node.requiresConnection || configuredTypes.has(node.requiresConnection);

  const availableTriggerNodes = hasNodes ? [] : triggerNodes.filter(isAvailable);

  const groupedActions = useMemo(() => {
    const available = (node: NodeCardDef) =>
      !node.requiresConnection || configuredTypes.has(node.requiresConnection);

    return actionNodes.filter(available).reduce<Record<NodeCategory, NodeCardDef[]>>(
      (grouped, node) => {
        const category = node.category ?? "Core";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(node);
        return grouped;
      },
      {} as Record<NodeCategory, NodeCardDef[]>,
    );
  }, [configuredTypes]);

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(category)) {
        next.delete(category);
      } else {
        if (next.size >= MAX_EXPANDED_CATEGORIES) {
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(category);
      }
      return next;
    });
  };

  return {
    availableTriggerNodes,
    groupedActions,
    expandedCategories,
    toggleCategory,
  };
}
