import { describe, expect, it } from "vitest";
import {
  aiConfigProblem,
  chatCompletionsUrl,
  modelsUrl,
  normalizeProvider,
  resolveAIConfig,
} from "./providers";

describe("normalizeProvider", () => {
  it("accepts the four known providers", () => {
    for (const provider of ["deepseek", "openai", "claude", "custom"] as const) {
      expect(normalizeProvider(provider)).toBe(provider);
    }
  });

  it("keeps legacy connections on OpenAI when the provider is missing", () => {
    expect(normalizeProvider(undefined)).toBe("openai");
    expect(normalizeProvider("")).toBe("openai");
    expect(normalizeProvider("something-else")).toBe("openai");
  });
});

describe("resolveAIConfig", () => {
  it("defaults DeepSeek to its base URL and deepseek-flash", () => {
    const config = resolveAIConfig({ provider: "deepseek", apiKey: "sk-test" });

    expect(config).toMatchObject({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-flash",
      requiresApiKey: true,
    });
    expect(chatCompletionsUrl(config.baseUrl)).toBe("https://api.deepseek.com/chat/completions");
    expect(modelsUrl(config.baseUrl)).toBe("https://api.deepseek.com/models");
  });

  it("keeps the OpenAI and Claude defaults", () => {
    expect(resolveAIConfig({ provider: "openai" })).toMatchObject({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    });
    expect(resolveAIConfig({ provider: "claude" })).toMatchObject({
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-3-5-sonnet-20241022",
    });
  });

  it("lets the configured base URL and model win", () => {
    const config = resolveAIConfig({
      provider: "deepseek",
      baseUrl: "https://gateway.internal/ai/",
      model: "deepseek-v4-pro",
    });

    expect(config.baseUrl).toBe("https://gateway.internal/ai");
    expect(config.model).toBe("deepseek-v4-pro");
    expect(chatCompletionsUrl(config.baseUrl)).toBe("https://gateway.internal/ai/chat/completions");
  });

  it("keeps a custom endpoint empty instead of inventing a default", () => {
    const config = resolveAIConfig({ provider: "custom" });

    expect(config.baseUrl).toBe("");
    expect(config.model).toBe("");
    expect(config.requiresApiKey).toBe(false);
  });
});

describe("aiConfigProblem", () => {
  it("requires a base URL for a custom endpoint", () => {
    const config = resolveAIConfig({ provider: "custom" });
    expect(aiConfigProblem(config)).toBe("Base URL is required for a custom endpoint");
  });

  it("requires a key for hosted providers", () => {
    expect(aiConfigProblem(resolveAIConfig({ provider: "deepseek" }))).toBe("API Key is missing");
  });

  it("allows a custom endpoint without a key", () => {
    const config = resolveAIConfig({ provider: "custom", baseUrl: "http://localhost:11434/v1" });
    expect(aiConfigProblem(config)).toBeNull();
  });

  it("rejects a non-http base URL", () => {
    const config = resolveAIConfig({ provider: "custom", baseUrl: "localhost:11434" });
    expect(aiConfigProblem(config)).toBe("Base URL must start with http:// or https://");
  });

  it("requires a model only when the caller asks for one", () => {
    const config = resolveAIConfig({ provider: "custom", baseUrl: "http://localhost:11434/v1" });

    expect(aiConfigProblem(config)).toBeNull();
    expect(aiConfigProblem(config, { requireModel: true })).toBe(
      "Model is required for a custom endpoint",
    );
  });
});
