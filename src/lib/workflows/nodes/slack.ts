import { sendMessage, type SlackConfig } from "@/lib/slack";
import { getConnection } from "@/lib/db/connections";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";
import type { ContextStep } from "@/lib/workflow-context";

export async function handleSendMessage(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: { type: "info" | "success" | "error"; message: string; timestamp: string }[] = [];
  const now = () => new Date().toISOString();

  const connectionId = meta.connectionId;
  if (!connectionId) {
    return { success: false, message: "No Slack connection selected", logs };
  }

  logs.push({ type: "info", message: `Loading Slack connection ${connectionId}`, timestamp: now() });
  const connection = await getConnection(connectionId);
  if (!connection) {
    return { success: false, message: "Slack connection not found", logs };
  }

  const config: SlackConfig = {
    botToken: (connection.config as Record<string, string>).botToken,
  };

  const channel = resolveTemplates(meta.channel || "", ancestorChain);
  const text = resolveTemplates(meta.text || "", ancestorChain);
  const threadTs = meta.threadTs ? resolveTemplates(meta.threadTs, ancestorChain) : undefined;

  logs.push({ type: "info", message: `Resolved channel: ${channel}`, timestamp: now() });
  if (!channel) {
    return { success: false, message: "Channel is required", logs };
  }
  if (!text) {
    return { success: false, message: "Message text is required", logs };
  }

  try {
    logs.push({ type: "info", message: "Sending message to Slack...", timestamp: now() });
    const result = await sendMessage(config, channel, text, threadTs);
    logs.push({ type: "success", message: `Message sent to ${channel}`, timestamp: now() });
    return {
      success: true,
      message: `Message sent to ${channel}`,
      data: { ts: result.ts, channel: result.channel },
      logs,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send Slack message";
    logs.push({ type: "error", message: msg, timestamp: now() });
    return { success: false, message: msg, logs };
  }
}
