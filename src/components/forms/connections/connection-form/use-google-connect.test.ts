import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGoogleConnect } from "./use-google-connect";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGoogleConnect", () => {
  it("cannot connect until a service and a name are set", () => {
    const { result } = renderHook(() =>
      useGoogleConnect({ connectionName: "", returnTo: "/connections" }),
    );

    expect(result.current.canConnect).toBe(false);

    act(() => result.current.toggleService("gmail"));
    expect(result.current.canConnect).toBe(false);
  });

  it("builds the authorize URL with the selected services", () => {
    const { result } = renderHook(() =>
      useGoogleConnect({ connectionName: "Work", returnTo: "/connections" }),
    );

    act(() => result.current.toggleService("gmail"));
    act(() => result.current.toggleService("sheets"));

    const url = new URL(result.current.authorizeUrl, "http://localhost");

    expect(result.current.canConnect).toBe(true);
    expect(url.pathname).toBe("/api/oauth/google/start");
    expect(url.searchParams.get("services")).toBe("gmail,sheets");
    expect(url.searchParams.get("name")).toBe("Work");
    expect(url.searchParams.get("returnTo")).toBe("/connections");
    expect(url.searchParams.get("connectionId")).toBeNull();
  });

  it("includes the connection id when reconnecting", () => {
    const { result } = renderHook(() =>
      useGoogleConnect({ connectionId: "conn-1", connectionName: "Work", returnTo: "/connections" }),
    );

    act(() => result.current.toggleService("drive"));

    expect(new URL(result.current.authorizeUrl, "http://localhost").searchParams.get("connectionId")).toBe(
      "conn-1",
    );
  });

  it("toggles a service off again", () => {
    const { result } = renderHook(() =>
      useGoogleConnect({ connectionName: "Work", returnTo: "/connections" }),
    );

    act(() => result.current.toggleService("calendar"));
    act(() => result.current.toggleService("calendar"));

    expect(result.current.services).toEqual([]);
  });

  it("disconnects through the connection endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onDisconnected = vi.fn();

    const { result } = renderHook(() =>
      useGoogleConnect({
        connectionId: "conn-1",
        connectionName: "Work",
        returnTo: "/connections",
        onDisconnected,
      }),
    );

    await act(async () => {
      await result.current.disconnect();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connections/conn-1/oauth",
      expect.objectContaining({ method: "POST", body: '{"action":"disconnect"}' }),
    );
    expect(onDisconnected).toHaveBeenCalled();
  });
});
