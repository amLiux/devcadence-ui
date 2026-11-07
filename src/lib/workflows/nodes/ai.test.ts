import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAIConfig } from "@/lib/ai/providers";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { callAI } from "./ai";

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callAI", () => {
  it("calls DeepSeek at its chat completions endpoint with deepseek-flash", async () => {
    const fetchMock = mockFetch({ choices: [{ message: { content: "hello" } }] });
    const config = resolveAIConfig({ provider: "deepseek", apiKey: "sk-deep" });

    const response = await callAI(config, "system", "user");

    expect(response).toBe("hello");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer sk-deep",
        },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      model: "deepseek-flash",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
    });
  });

  it("calls a custom endpoint without an Authorization header", async () => {
    const fetchMock = mockFetch({ choices: [{ message: { content: "local" } }] });
    const config = resolveAIConfig({
      provider: "custom",
      baseUrl: "http://localhost:11434/v1/",
      model: "llama3.1",
    });

    await callAI(config, "system", "user");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/chat/completions",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("keeps Claude on the messages API with its headers", async () => {
    const fetchMock = mockFetch({ content: [{ text: "bonjour" }] });
    const config = resolveAIConfig({ provider: "claude", apiKey: "sk-ant" });

    const response = await callAI(config, "be brief", "hello");

    expect(response).toBe("bonjour");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": "sk-ant",
        },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.system).toBe("be brief");
    expect(body.model).toBe("claude-3-5-sonnet-20241022");
  });

  it("reports the provider status and redacts the key from the error", async () => {
    mockFetch("bad key sk-deep", false, 401);
    const config = resolveAIConfig({ provider: "deepseek", apiKey: "sk-deep" });

    await expect(callAI(config, "system", "user")).rejects.toThrow(
      /DeepSeek API error: 401.*\*\*\*/,
    );
  });

  it("fails clearly when the response has no content", async () => {
    mockFetch({ choices: [] });
    const config = resolveAIConfig({ provider: "deepseek", apiKey: "sk-deep" });

    await expect(callAI(config, "system", "user")).rejects.toThrow(
      "DeepSeek returned no message content",
    );
  });
});
