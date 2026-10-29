import { sendDiscordMessage, sendDirectMessage, getChannelMessages, type DiscordConfig } from "@/lib/discord";
import { getConnection } from "@/lib/db/connections";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";
import type { ContextStep } from "@/lib/workflow-context";

async function loadDiscordConfig(connectionId: string): Promise<{ config: DiscordConfig; message: string } | null> {
  if (!connectionId) {
    return { config: { botToken: "" }, message: "No Discord connection selected" };
  }
  const connection = await getConnection(connectionId);
  if (!connection) {
    return { config: { botToken: "" }, message: "Discord connection not found" };
  }
  const connConfig = connection.config as Record<string, string>;
  return { config: { botToken: connConfig.botToken }, message: "" };
}

export async function handleSendDiscordMessage(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const loaded = await loadDiscordConfig(meta.connectionId);
  if (!loaded || loaded.message) {
    return { success: false, message: loaded?.message || "Discord connection error" };
  }

  const resolve = (v: string) => resolveTemplates(v, ancestorChain);
  const channelId = resolve(meta.channelId || "");
  const content = resolve(meta.content || "");

  if (!channelId) return { success: false, message: "Channel ID is required" };
  if (!content) return { success: false, message: "Message content is required" };

  let embeds: Record<string, unknown>[] | undefined;
  if (meta.embeds) {
    try {
      const parsed = JSON.parse(meta.embeds) as unknown;
      if (Array.isArray(parsed)) embeds = parsed as Record<string, unknown>[];
    } catch {
      return { success: false, message: "Invalid embeds JSON" };
    }
  }

  try {
    const result = await sendDiscordMessage(loaded.config, { channelId, content, embeds });
    return { success: true, message: `Message sent to channel ${result.channelId}`, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send Discord message";
    return { success: false, message: msg };
  }
}

export async function handleReadDiscordMessages(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const loaded = await loadDiscordConfig(meta.connectionId);
  if (!loaded || loaded.message) {
    return { success: false, message: loaded?.message || "Discord connection error" };
  }

  const resolve = (v: string) => resolveTemplates(v, ancestorChain);
  const channelId = resolve(meta.channelId || "");
  if (!channelId) return { success: false, message: "Channel ID is required" };

  const limit = parseInt(meta.limit || "50", 10);
  const after = meta.after ? resolve(meta.after) : undefined;

  try {
    const messages = await getChannelMessages(loaded.config, { channelId, limit, after });
    return {
      success: true,
      message: `Read ${messages.length} message${messages.length === 1 ? "" : "s"}`,
      data: { messages },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to read Discord messages";
    return { success: false, message: msg };
  }
}

export async function handleSendDirectMessage(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const loaded = await loadDiscordConfig(meta.connectionId);
  if (!loaded || loaded.message) {
    return { success: false, message: loaded?.message || "Discord connection error" };
  }

  const resolve = (v: string) => resolveTemplates(v, ancestorChain);
  const userId = resolve(meta.userId || "");
  const content = resolve(meta.content || "");

  if (!userId) return { success: false, message: "User ID is required" };
  if (!content) return { success: false, message: "Message content is required" };

  try {
    const result = await sendDirectMessage(loaded.config, { userId, content });
    return { success: true, message: `DM sent to user ${userId}`, data: result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send DM";
    return { success: false, message: msg };
  }
}

export function handleListenDiscordMessages(
  meta: Record<string, string>,
  _ancestorChain?: ContextStep,
  body?: Record<string, unknown>,
): NodeHandlerResult {
  if (!body || !Array.isArray(body.messages)) {
    return {
      success: false,
      message: "No Discord messages in trigger payload. Trigger runs only via scheduled worker poll.",
    };
  }
  return {
    success: true,
    message: `Triggered with ${body.messages.length} message${body.messages.length === 1 ? "" : "s"}`,
    data: body,
  };
}
