"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "devdock-docs-google-oauth-steps";

export const OAUTH_SETUP_STEPS = [
  { id: "project", label: "Create (or pick) a Google Cloud project" },
  { id: "apis", label: "Enable the APIs you will use" },
  { id: "consent", label: "Configure the consent screen" },
  { id: "scopes", label: "Declare the OAuth scopes" },
  { id: "test-users", label: "Add yourself as a test user" },
  { id: "client", label: "Create the OAuth client with the redirect URI" },
  { id: "env", label: "Put the client id and secret in .env and restart" },
  { id: "authorize", label: "Authorize the account from Connections" },
] as const;

export type OAuthSetupStepId = (typeof OAUTH_SETUP_STEPS)[number]["id"];

function readStored(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * Local-only progress for an operator's own setup. Deliberately separate from
 * the docs completion: reading the guide should not require configuring Google.
 */
export function useOAuthChecklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted checklist on mount
    setDone(readStored());
  }, []);

  const toggle = useCallback((id: OAuthSetupStepId) => {
    setDone((previous) => {
      const next = { ...previous, [id]: !previous[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage can be unavailable (private mode); keep in-memory state
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setDone({});
  }, []);

  const doneCount = OAUTH_SETUP_STEPS.filter((step) => done[step.id]).length;
  const total = OAUTH_SETUP_STEPS.length;

  return { done, toggle, reset, doneCount, total, allDone: doneCount === total };
}
