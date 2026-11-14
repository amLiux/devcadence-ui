import { replyToThread, searchMessages, sendEmail } from "@/lib/gmail";
import { resolveTemplates } from "@/lib/workflow-context";
import type { ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

const now = () => new Date().toISOString();

type Log = { type: "info" | "success" | "error"; message: string; timestamp: string };

function failure(message: string, logs: Log[]): NodeHandlerResult {
  logs.push({ type: "error", message, timestamp: now() });
  return { success: false, message, logs };
}

export async function handleSendGmail(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const to = resolveTemplates(meta.to || "", ancestorChain).trim();
  const subject = resolveTemplates(meta.subject || "", ancestorChain);
  const text = resolveTemplates(meta.body || "", ancestorChain);
  const html = meta.html ? resolveTemplates(meta.html, ancestorChain) : undefined;
  const cc = meta.cc ? resolveTemplates(meta.cc, ancestorChain) : undefined;
  const bcc = meta.bcc ? resolveTemplates(meta.bcc, ancestorChain) : undefined;

  if (!to) return failure("Recipient (to) is required", logs);
  if (!subject) return failure("Subject is required", logs);
  if (!text && !html) return failure("Email body is required", logs);

  try {
    logs.push({ type: "info", message: `Sending Gmail to ${to}`, timestamp: now() });
    const result = await sendEmail({ to, subject, text, html, cc, bcc });
    logs.push({ type: "success", message: `Email sent to ${to}`, timestamp: now() });
    return {
      success: true,
      message: `Email sent to ${to}`,
      data: { messageId: result.id, threadId: result.threadId },
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to send email", logs);
  }
}

export async function handleSearchEmails(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const query = resolveTemplates(meta.query || "", ancestorChain).trim();
  const maxResults = Number.parseInt(meta.maxResults || "10", 10);

  try {
    logs.push({
      type: "info",
      message: `Searching Gmail${query ? ` with "${query}"` : ""}`,
      timestamp: now(),
    });
    const messages = await searchMessages({
      query,
      maxResults: Number.isFinite(maxResults) ? maxResults : 10,
    });
    logs.push({
      type: "success",
      message: `Found ${messages.length} message${messages.length === 1 ? "" : "s"}`,
      timestamp: now(),
    });
    return {
      success: true,
      message: `Found ${messages.length} messages`,
      data: { messages, count: messages.length },
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to search Gmail", logs);
  }
}

export async function handleReplyToEmail(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const threadId = resolveTemplates(meta.threadId || "", ancestorChain).trim();
  const text = resolveTemplates(meta.body || "", ancestorChain);
  const html = meta.html ? resolveTemplates(meta.html, ancestorChain) : undefined;

  if (!threadId) return failure("Thread ID is required", logs);
  if (!text && !html) return failure("Reply body is required", logs);

  try {
    logs.push({ type: "info", message: `Replying in thread ${threadId}`, timestamp: now() });
    const result = await replyToThread({ threadId, text, html });
    logs.push({ type: "success", message: "Reply sent", timestamp: now() });
    return {
      success: true,
      message: "Reply sent",
      data: { messageId: result.id, threadId: result.threadId },
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to reply", logs);
  }
}

/**
 * The trigger payload is seeded by the worker poll (see gmail-trigger.ts), so
 * this handler only validates it for manual node tests.
 */
export function handleWatchEmails(
  _meta: Record<string, string>,
  _ancestorChain?: ContextStep,
  body?: Record<string, unknown>,
): NodeHandlerResult {
  if (!body || !Array.isArray(body.emails)) {
    return {
      success: false,
      message: "No emails in trigger payload. The trigger runs via the scheduled worker poll.",
    };
  }

  const count = body.emails.length;
  return {
    success: true,
    message: `Triggered with ${count} email${count === 1 ? "" : "s"}`,
    data: body,
  };
}
