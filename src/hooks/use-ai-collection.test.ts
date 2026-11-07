import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAiCollection } from "./use-ai-collection";
import type { AIContent } from "@/lib/types";

function json(body: unknown) {
  return { ok: true, json: async () => body };
}

const existing: AIContent = { id: "m1", name: "Old", content: "Old content", description: "" };

function setup() {
  return renderHook(() => useAiCollection<AIContent>("/api/ai/memory", "content"));
}

describe("useAiCollection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not submit when the required field is blank", async () => {
    const fetchMock = vi.fn(async () => json({}));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = setup();
    act(() => result.current.setDraft({ name: "Name", content: "   " }));
    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("creates, prepends and keeps the created record in the draft", async () => {
    const created: AIContent = { id: "m2", name: "New", content: "Body", description: "" };
    const fetchMock = vi.fn(async () => json(created));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = setup();
    act(() => result.current.setDraft({ name: "New", content: "Body" }));
    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/memory", expect.objectContaining({ method: "POST" }));
    expect(result.current.items).toEqual([created]);
    expect(result.current.selected).toBe("m2");
    expect(result.current.draft).toEqual(created);
  });

  it("updates in place when the draft has an id", async () => {
    const fetchMock = vi.fn(async () => json(existing));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = setup();
    act(() => result.current.setItems([existing]));
    act(() => result.current.select("m1"));
    act(() => result.current.setDraft({ ...result.current.draft, name: "Renamed" }));
    await act(async () => {
      await result.current.submit();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/memory/m1", expect.objectContaining({ method: "PUT" }));
    expect(result.current.items).toEqual([{ ...existing, name: "Renamed" }]);
    expect(result.current.items).toHaveLength(1);
  });

  it("removes the item and clears the selection when it was selected", async () => {
    const fetchMock = vi.fn(async () => json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = setup();
    act(() => result.current.setItems([existing]));
    act(() => result.current.select("m1"));
    await act(async () => {
      await result.current.remove("m1");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/ai/memory/m1", expect.objectContaining({ method: "DELETE" }));
    expect(result.current.items).toEqual([]);
    expect(result.current.selected).toBeNull();
    expect(result.current.draft).toEqual({});
  });
});
