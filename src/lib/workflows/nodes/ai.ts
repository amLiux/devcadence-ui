import { prisma } from "@/lib/db";
import { getConnection } from "@/lib/db/connections";
import {
  aiConfigProblem,
  chatCompletionsUrl,
  messagesUrl,
  resolveAIConfig,
  type ResolvedAIConfig,
} from "@/lib/ai/providers";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

// --- 4-layer system prompt assembly ---

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

async function getAIConfig(connectionId: string): Promise<ResolvedAIConfig> {
  const conn = await getConnection(connectionId);
  if (!conn) throw new Error("AI connection not found");
  if (conn.type !== "AI") throw new Error("Connection is not an AI connection");

  const config = resolveAIConfig(conn.config as Record<string, string>);
  const problem = aiConfigProblem(config, { requireModel: true });
  if (problem) throw new Error(problem);

  return config;
}

function redact(message: string, secret: string): string {
  return secret ? message.split(secret).join("***") : message;
}

async function callChatCompletions(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(chatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${config.label} API error: ${res.status} ${redact(err, config.apiKey)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`${config.label} returned no message content`);
  }
  return content;
}

async function callClaude(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (config.apiKey) {
    headers["x-api-key"] = config.apiKey;
  }

  const res = await fetch(messagesUrl(config.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${config.label} API error: ${res.status} ${redact(err, config.apiKey)}`);
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const content = data.content?.[0]?.text;
  if (typeof content !== "string") {
    throw new Error(`${config.label} returned no message content`);
  }
  return content;
}

export async function callAI(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (config.provider === "claude") {
    return callClaude(config, systemPrompt, userMessage);
  }
  return callChatCompletions(config, systemPrompt, userMessage);
}

/** Prompt node — sends a prompt to AI and returns the response. */
export async function handlePrompt(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const { connectionId } = meta;
  if (!connectionId) return { success: false, message: "AI connection is required" };

  const userPromptTemplate = await resolveUserPromptTemplate(meta);
  if (!userPromptTemplate) return { success: false, message: "Prompt is required" };

  const config = await getAIConfig(connectionId);
  const resolvedPrompt = resolveTemplates(userPromptTemplate, ancestorChain);
  const baseSystemPrompt = await buildSystemPrompt(meta, "prompt");
  const resolvedSystemPrompt = resolveTemplates(baseSystemPrompt, ancestorChain);

  const response = await callAI(config, resolvedSystemPrompt, resolvedPrompt);
  return {
    success: true,
    message: `Prompt completed (${response.length} chars)`,
    data: { response },
  };
}

async function resolveUserPromptTemplate(meta: Record<string, string>): Promise<string | null> {
  if (!meta.promptId) return null;
  const saved = await prisma.aIPrompt.findUnique({ where: { id: meta.promptId } });
  return saved?.template ?? null;
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