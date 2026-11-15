import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OAUTH_SETUP_STEPS, useOAuthChecklist } from "./use-oauth-checklist";

const KEY = "devdock-docs-google-oauth-steps";

beforeEach(() => {
  localStorage.clear();
});

describe("useOAuthChecklist", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useOAuthChecklist());
    expect(result.current.doneCount).toBe(0);
    expect(result.current.total).toBe(OAUTH_SETUP_STEPS.length);
  });

  it("toggles a step and persists it", () => {
    const { result } = renderHook(() => useOAuthChecklist());

    act(() => result.current.toggle("project"));

    expect(result.current.doneCount).toBe(1);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toMatchObject({ project: true });
  });

  it("hydrates from localStorage", async () => {
    localStorage.setItem(KEY, JSON.stringify({ project: true, env: true }));

    const { result } = renderHook(() => useOAuthChecklist());

    await waitFor(() => expect(result.current.doneCount).toBe(2));
  });

  it("resets the checklist", () => {
    const { result } = renderHook(() => useOAuthChecklist());
    act(() => result.current.toggle("apis"));

    act(() => result.current.reset());

    expect(result.current.doneCount).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("reports allDone when every step is checked", () => {
    const { result } = renderHook(() => useOAuthChecklist());

    for (const step of OAUTH_SETUP_STEPS) {
      act(() => result.current.toggle(step.id));
    }

    expect(result.current.allDone).toBe(true);
  });
});
