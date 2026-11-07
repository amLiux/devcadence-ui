export type AIProviderId = "deepseek" | "openai" | "claude" | "custom";

export interface AIProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
  requiresApiKey: boolean;
}

/**
 * Provider presets only fill defaults. The endpoint is always configuration,
 * so a team can point DeepSeek or a local model at its own gateway.
 */
export const AI_PROVIDERS: Record<AIProviderId, AIProviderPreset> = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
    requiresApiKey: true,
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
    requiresApiKey: true,
  },
  claude: {
    label: "Claude",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-sonnet-20241022",
    requiresApiKey: true,
  },
  custom: {
    label: "Custom endpoint",
    baseUrl: "",
    model: "",
    requiresApiKey: false,
  },
};

export interface AIConnectionConfig {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface ResolvedAIConfig {
  provider: AIProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  requiresApiKey: boolean;
}

export function isAIProviderId(value: string): value is AIProviderId {
  return value === "deepseek" || value === "openai" || value === "claude" || value === "custom";
}

/**
 * Connections created before providers were configurable have no provider, and
 * they were always OpenAI. Keep that behaviour instead of silently switching
 * an existing connection to DeepSeek.
 */
export function normalizeProvider(value: string | undefined): AIProviderId {
  const provider = value?.trim().toLowerCase() ?? "";
  return isAIProviderId(provider) ? provider : "openai";
}

export function trimBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function resolveAIConfig(config: AIConnectionConfig): ResolvedAIConfig {
  const provider = normalizeProvider(config.provider);
  const preset = AI_PROVIDERS[provider];

  return {
    provider,
    label: preset.label,
    baseUrl: trimBaseUrl(config.baseUrl ?? "") || preset.baseUrl,
    apiKey: (config.apiKey ?? "").trim(),
    model: (config.model ?? "").trim() || preset.model,
    requiresApiKey: preset.requiresApiKey,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function aiConfigProblem(
  config: ResolvedAIConfig,
  options: { requireModel?: boolean } = {},
): string | null {
  if (!config.baseUrl) return "Base URL is required for a custom endpoint";
  if (!isHttpUrl(config.baseUrl)) return "Base URL must start with http:// or https://";
  if (config.requiresApiKey && !config.apiKey) return "API Key is missing";
  if (options.requireModel && !config.model) return "Model is required for a custom endpoint";
  return null;
}

export function modelsUrl(baseUrl: string): string {
  return `${trimBaseUrl(baseUrl)}/models`;
}

export function chatCompletionsUrl(baseUrl: string): string {
  return `${trimBaseUrl(baseUrl)}/chat/completions`;
}

export function messagesUrl(baseUrl: string): string {
  return `${trimBaseUrl(baseUrl)}/messages`;
}
