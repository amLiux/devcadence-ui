"use client";

import { useState, useEffect, useCallback } from "react";

const PREFIX = "devdock-docs";

const DOCS_PAGES = ["tutorial", "workflow", "connecting", "connections", "nodes", "template-variables", "conditional-logic"] as const;
export type DocsPage = (typeof DOCS_PAGES)[number];

function key(page: DocsPage) {
  return `${PREFIX}-${page}`;
}

export function useDocsProgress() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const p of DOCS_PAGES) {
      try {
        next[p] = localStorage.getItem(key(p)) === "true";
      } catch {
        next[p] = false;
      }
    }
    setCompleted(next);
  }, []);

  const markPage = useCallback((page: DocsPage) => {
    try {
      localStorage.setItem(key(page), "true");
    } catch {}
    setCompleted((prev) => ({ ...prev, [page]: true }));
  }, []);

  const isPageDone = (page: DocsPage) => completed[page] === true;

  const doneCount = DOCS_PAGES.filter((p) => completed[p]).length;
  const total = DOCS_PAGES.length;
  const percent = doneCount === 0 ? 0 : Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  return { completed, markPage, isPageDone, doneCount, total, percent, allDone };
}

// Backward compat for tutorial page
export function useTutorialProgress() {
  const { markPage, isPageDone } = useDocsProgress();

  const markComplete = useCallback(() => markPage("tutorial"), [markPage]);
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key("tutorial"));
    } catch {}
  }, []);

  return {
    completed: isPageDone("tutorial"),
    markComplete,
    reset,
  };
}
