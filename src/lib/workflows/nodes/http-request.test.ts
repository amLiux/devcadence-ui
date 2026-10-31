import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { handleHttpRequest } from "./http-request";
import { cacheClear } from "@/lib/cache";
import type { ContextStep } from "@/lib/workflow-context";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textResponse(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "text/plain" },
    json: async () => JSON.parse(body),
    text: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  cacheClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleHttpRequest", () => {
  it("fails when the URL is missing", async () => {
    const result = await handleHttpRequest({}, undefined);

    expect(result).toEqual({ success: false, message: "URL is required" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails when the headers are not valid JSON", async () => {
    const result = await handleHttpRequest(
      { url: "https://api.test/data", headers: "{not json" },
      undefined,
    );

    expect(result).toEqual({ success: false, message: "Invalid headers JSON" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("performs a GET request and wraps the JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await handleHttpRequest({ url: "https://api.test/data" }, undefined);

    expect(fetchMock).toHaveBeenCalledWith("https://api.test/data", { method: "GET", headers: {} });
    expect(result.success).toBe(true);
    expect(result.message).toBe("GET https://api.test/data → 200");
    expect(result.data).toEqual({ status: 200, body: { ok: true } });
  });

  it("serves a repeated GET from the in-memory cache", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await handleHttpRequest({ url: "https://api.test/cached" }, undefined);
    const second = await handleHttpRequest({ url: "https://api.test/cached" }, undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.message).toBe("GET https://api.test/cached → 200 (cached)");
    expect(second.data).toEqual({ status: 200, body: { ok: true } });
  });

  it("does not cache failed GET responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }, 500));

    const first = await handleHttpRequest({ url: "https://api.test/fails" }, undefined);
    await handleHttpRequest({ url: "https://api.test/fails" }, undefined);

    expect(first.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends non-GET requests with method and headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));

    const result = await handleHttpRequest(
      { url: "https://api.test/items", method: "post", headers: '{"Content-Type":"application/json"}' },
      undefined,
    );

    expect(fetchMock).toHaveBeenCalledWith("https://api.test/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("POST https://api.test/items → 201");
  });

  it("never caches non-GET requests", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201));

    await handleHttpRequest({ url: "https://api.test/items", method: "POST" }, undefined);
    await handleHttpRequest({ url: "https://api.test/items", method: "POST" }, undefined);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the raw text for non-JSON responses", async () => {
    fetchMock.mockResolvedValue(textResponse("hello"));

    const result = await handleHttpRequest({ url: "https://api.test/text" }, undefined);

    expect(result.data).toEqual({ status: 200, body: "hello" });
  });

  it("resolves URL templates from the ancestor chain", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const chain: ContextStep = {
      name: "Transform",
      output: { id: 42 },
      success: true,
      error: null,
    };

    await handleHttpRequest({ url: "https://api.test/items/{{previousStep.id}}" }, chain);

    expect(fetchMock).toHaveBeenCalledWith("https://api.test/items/42", { method: "GET", headers: {} });
  });
});
