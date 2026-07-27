import { prisma } from "@/lib/db";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

// --- 4-layer system prompt assembly ---

const NODE_INSTRUCTIONS: Record<string, string> = {
  prompt: "",
  classify: "",
  extract: "",
};

export async function buildSystemPrompt(
  meta: Record<string, string>,
  nodeType: "prompt" | "classify" | "extract",
): Promise<string> {
  const parts: string[] = [];

  // 1. Persona
  if (meta.personaId) {
    const persona = await prisma.aIPersona.findUnique({ where: { id: meta.personaId } });
    if (persona) {
      parts.push(`# Identity\nYou are ${persona.name}.\n\n${persona.systemPrompt}`);
      if (persona.tone) parts.push(`Tone: ${persona.tone}`);
    }
  }

  // 2. Context
  if (meta.contextIds) {
    const ids = meta.contextIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) {
      const contexts = await prisma.aIContext.findMany({ where: { id: { in: ids } } });
      if (contexts.length) {
        const block = contexts.map((c) => `## ${c.name}\n${c.content}`).join("\n\n");
        parts.push(`# Context\n${block}`);
      }
    }
  }

  // 3. Memory
  if (meta.memoryIds) {
    const ids = meta.memoryIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) {
      const memories = await prisma.aIMemory.findMany({ where: { id: { in: ids } } });
      if (memories.length) {
        const block = memories.map((m) => `## ${m.name}\n${m.content}`).join("\n\n");
        parts.push(`# Memory\n${block}`);
      }
    }
  }

  // 4. Node-specific instructions
  if (nodeType === "classify") {
    const categories = meta.categories?.split(",").map((c) => c.trim()).filter(Boolean) || [];
    parts.push(`Classify the following text into exactly one of these categories: ${categories.join(", ")}.\nRespond with ONLY the category name, nothing else.`);
  } else if (nodeType === "extract") {
    const fields = meta.fields?.split(",").map((f) => f.trim()).filter(Boolean) || [];
    parts.push(`Extract the following fields from the text: ${fields.join(", ")}.\nRespond with a valid JSON object where each key is a field name and the value is the extracted content.\nIf a field is not found, use null.\nDo NOT include any markdown formatting, just the raw JSON.`);
  } else {
    // prompt node — use explicit systemPrompt or default
    parts.push(meta.systemPrompt || "You are a helpful assistant.");
  }

  return parts.join("\n\n---\n\n");
}

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
  const baseSystemPrompt = await buildSystemPrompt(meta, "prompt");
  const resolvedSystemPrompt = resolveTemplates(baseSystemPrompt, ancestorChain);

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
  const systemPrompt = await buildSystemPrompt(meta, "classify");

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
  const systemPrompt = await buildSystemPrompt(meta, "extract");

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