import { sendMessage, type SlackConfig } from "@/lib/slack";
import { getConnection } from "@/lib/db/connections";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";
import type { ContextStep } from "@/lib/workflow-context";

export async function handleSendMessage(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const connectionId = meta.connectionId;
  if (!connectionId) {
    return { success: false, message: "No Slack connection selected" };
  }

  const connection = await getConnection(connectionId);
  if (!connection) {
    return { success: false, message: "Slack connection not found" };
  }

  const config: SlackConfig = {
    botToken: (connection.config as Record<string, string>).botToken,
  };

  const channel = resolveTemplates(meta.channel || "", ancestorChain);
  const text = resolveTemplates(meta.text || "", ancestorChain);
  const threadTs = meta.threadTs ? resolveTemplates(meta.threadTs, ancestorChain) : undefined;

  try {
    const result = await sendMessage(config, channel, text, threadTs);
    return {
      success: true,
      message: `Message sent to ${channel}`,
      data: { ts: result.ts, channel: result.channel },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send Slack message";
    return { success: false, message: msg };
  }
}
