import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invalidateConnections, useConnections } from "./use-connections";

function connection(id: string, type: string) {
  return { id, type, name: id, description: "", config: {}, createdAt: "", updatedAt: "" };
}

beforeEach(() => {
  invalidateConnections();
  invalidateConnections("Google");
  vi.unstubAllGlobals();
});

describe("useConnections", () => {
  it("fetches the filtered endpoint and returns the list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([connection("g1", "Google")]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useConnections("Google"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith("/api/connections?type=Google");
    expect(result.current.connections).toHaveLength(1);
  });

  it("dedupes concurrent mounts of the same type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = renderHook(() => useConnections("Google"));
    const second = renderHook(() => useConnections("Google"));

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
      expect(second.result.current.loading).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the cache for a later mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = renderHook(() => useConnections("Slack"));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useConnections("Slack"));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches after invalidateConnections", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = renderHook(() => useConnections("Discord"));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    invalidateConnections("Discord");
    const second = renderHook(() => useConnections("Discord"));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));

    const { result } = renderHook(() => useConnections("AI"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load connections");
  });
});
