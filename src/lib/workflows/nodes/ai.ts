import { prisma } from "@/lib/db";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

interface AIProviderConfig {
  provider: string;
  apiKey: string;
  model?: string;
}

async function getAIConfig(connectionId: string): Promise<AIProviderConfig> {
  const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error(`Connection ${connectionId} not found`);
  if (conn.type !== "AI") throw new Error(`Connection ${connectionId} is not AI`);

  const config = conn.config as Record<string, string>;
  return {
    provider: config.provider || "openai",
    apiKey: config.apiKey,
    model: config.model,
  };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

async function callAI(
  config: AIProviderConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const model = config.model || (config.provider === "claude" ? "claude-3-5-sonnet-20241022" : "gpt-4o");

  if (config.provider === "claude") {
    return callClaude(config.apiKey, model, systemPrompt, userMessage);
  }
  return callOpenAI(config.apiKey, model, systemPrompt, userMessage);
}

/** Prompt node — sends a prompt to AI and returns the response. */
export async function handlePrompt(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "AI connection is required" };
  if (!meta.prompt) return { success: false, message: "Prompt is required" };

  const config = await getAIConfig(connectionId);
  const resolvedPrompt = resolveTemplates(meta.prompt, ancestorChain);
  const resolvedSystemPrompt = meta.systemPrompt
    ? resolveTemplates(meta.systemPrompt, ancestorChain)
    : "You are a helpful assistant.";

  const response = await callAI(config, resolvedSystemPrompt, resolvedPrompt);
  return {
    success: true,
    message: `Prompt completed (${response.length} chars)`,
    data: { response },
  };
}

/** Classify node — classifies input text into categories. */
export async function handleClassify(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "AI connection is required" };
  if (!meta.text) return { success: false, message: "Text to classify is required" };
  if (!meta.categories) return { success: false, message: "Categories are required" };

  const config = await getAIConfig(connectionId);
  const resolvedText = resolveTemplates(meta.text, ancestorChain);
  const categories = meta.categories.split(",").map((c) => c.trim());

  const systemPrompt = `Classify the following text into exactly one of these categories: ${categories.join(", ")}.
Respond with ONLY the category name, nothing else.`;

  const response = await callAI(config, systemPrompt, resolvedText);
  const classification = response.trim();

  return {
    success: true,
    message: `Classified as: ${classification}`,
    data: { classification, categories },
  };
}

/** Extract node — extracts structured data from text. */
export async function handleExtract(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "AI connection is required" };
  if (!meta.text) return { success: false, message: "Text to extract from is required" };
  if (!meta.fields) return { success: false, message: "Fields to extract are required" };

  const config = await getAIConfig(connectionId);
  const resolvedText = resolveTemplates(meta.text, ancestorChain);
  const fields = meta.fields.split(",").map((f) => f.trim());

  const systemPrompt = `Extract the following fields from the text: ${fields.join(", ")}.
Respond with a valid JSON object where each key is a field name and the value is the extracted content.
If a field is not found, use null.
Do NOT include any markdown formatting, just the raw JSON.`;

  const response = await callAI(config, systemPrompt, resolvedText);

  let extracted;
  try {
    extracted = JSON.parse(response);
  } catch {
    extracted = { raw: response };
  }

  return {
    success: true,
    message: `Extracted ${Object.keys(extracted).length} field(s)`,
    data: extracted,
  };
}