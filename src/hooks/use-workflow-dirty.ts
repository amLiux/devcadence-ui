"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Node, Edge } from "reactflow";
import { useEditor } from "@/providers/editor-provider";

function stripEphemeral(nodes: Node[]): unknown {
  return nodes.map(({ id, type, position, data }) => ({
    id,
    type,
    position,
    data,
  }));
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function useWorkflowDirty({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const { dirty, markDirty, setDirty } = useEditor();
  const snapshotRef = useRef<{ nodes: unknown; edges: unknown } | null>(null);
  const hasLoadedRef = useRef(false);

  // Store snapshot once after initial load — deep clone to avoid shared references
  useEffect(() => {
    if (!hasLoadedRef.current && nodes.length > 0) {
      hasLoadedRef.current = true;
      snapshotRef.current = {
        nodes: deepClone(stripEphemeral(nodes)),
        edges: deepClone(edges.map(({ id, source, target, sourceHandle }) => ({ id, source, target, sourceHandle }))),
      };
      setDirty(false);
    }
  }, [nodes, edges, setDirty]);

  // Detect dirty — only after initial load
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    const nodesChanged =
      JSON.stringify(stripEphemeral(nodes)) !==
      JSON.stringify(snapshotRef.current!.nodes);

    const edgesChanged =
      JSON.stringify(edges.map(({ id, source, target, sourceHandle }) => ({ id, source, target, sourceHandle }))) !==
      JSON.stringify(snapshotRef.current!.edges);

    if (nodesChanged || edgesChanged) {
      markDirty();
    }
  }, [nodes, edges, markDirty]);

  const markCleanAfterSave = useCallback(() => {
    snapshotRef.current = {
      nodes: deepClone(stripEphemeral(nodes)),
      edges: deepClone(edges.map(({ id, source, target, sourceHandle }) => ({ id, source, target, sourceHandle }))),
    };
    setDirty(false);
  }, [nodes, edges, setDirty]);

  const markClean = useCallback(
    (_n: Node[], _e: Edge[]) => {
      setDirty(false);
    },
    [setDirty],
  );

  return { dirty, markClean, markCleanAfterSave };
}
