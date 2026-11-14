import { googleFetch } from "@/lib/google/token";
import { buildRawEmail, stripReplyPrefix, type OutgoingEmail } from "./mime";
import {
  headerValue,
  parseGmailMessage,
  type GmailMessage,
  type GmailPayload,
  type RawGmailMessage,
} from "./parse";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/** New messages processed per poll. The rest wait for the next run. */
export const MAX_NEW_PER_POLL = 10;

async function fail(response: Response): Promise<never> {
  const body = await response.text();
  let detail = body;
  try {
    detail = JSON.parse(body)?.error?.message ?? body;
  } catch {
    // keep raw body
  }

  if (response.status === 401) {
    throw new Error("Google authorization expired. Reconnect the Google account.");
  }
  if (response.status === 403) {
    throw new Error("Gmail permission denied. Reconnect with the Gmail service selected.");
  }
  if (response.status === 429) {
    throw new Error("Gmail rate limit reached. Retry later.");
  }
  throw new Error(`Gmail API ${response.status}: ${detail}`);
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await googleFetch(url, init);
  if (!response.ok) await fail(response);
  return (await response.json()) as T;
}

export async function getMessage(id: string, format: "full" | "metadata" = "full"): Promise<GmailMessage> {
  const raw = await getJson<RawGmailMessage>(`${BASE}/messages/${encodeURIComponent(id)}?format=${format}`);
  return parseGmailMessage(raw);
}

export async function searchMessages(input: {
  query: string;
  maxResults?: number;
  includeBody?: boolean;
}): Promise<GmailMessage[]> {
  const maxResults = Math.min(Math.max(input.maxResults ?? 10, 1), 50);
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (input.query) params.set("q", input.query);

  const list = await getJson<{ messages?: { id: string }[] }>(`${BASE}/messages?${params.toString()}`);
  const ids = (list.messages ?? []).map((message) => message.id);
  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map((id) => getMessage(id, input.includeBody === false ? "metadata" : "full")),
  );
  return messages;
}

export async function sendEmail(
  email: OutgoingEmail & { threadId?: string },
): Promise<{ id: string; threadId: string }> {
  const body = JSON.stringify({
    raw: buildRawEmail(email),
    ...(email.threadId ? { threadId: email.threadId } : {}),
  });

  return getJson<{ id: string; threadId: string }>(`${BASE}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

interface RawThread {
  id: string;
  messages?: RawGmailMessage[];
}

export async function replyToThread(input: {
  threadId: string;
  text: string;
  html?: string;
  to?: string;
  subject?: string;
}): Promise<{ id: string; threadId: string }> {
  const thread = await getJson<RawThread>(
    `${BASE}/threads/${encodeURIComponent(input.threadId)}?format=full`,
  );
  const messages = thread.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last) {
    throw new Error(`Gmail thread ${input.threadId} has no messages to reply to`);
  }

  const headers = last.payload?.headers;
  const messageId = headerValue(headers, "Message-ID");
  const references = headerValue(headers, "References");
  const originalSubject = headerValue(headers, "Subject");

  return sendEmail({
    threadId: input.threadId,
    to: input.to || headerValue(headers, "From"),
    subject: input.subject || `Re: ${stripReplyPrefix(originalSubject)}`,
    text: input.text,
    html: input.html,
    inReplyTo: messageId || undefined,
    references: [references, messageId].filter(Boolean).join(" ") || undefined,
  });
}

/**
 * Fetches messages newer than `afterMs`, oldest first, capped so one poll
 * cannot produce a huge trigger payload. Callers persist the newest processed
 * internalDate so the remainder is picked up on the next poll.
 */export async function listNewEmails(input: {
  query: string;
  afterMs: number;
  maxResults?: number;
}): Promise<GmailMessage[]> {
  const maxResults = Math.min(Math.max(input.maxResults ?? 25, 1), 50);
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (input.query) params.set("q", input.query);

  const list = await getJson<{ messages?: { id: string }[] }>(`${BASE}/messages?${params.toString()}`);
  const ids = (list.messages ?? []).map((message) => message.id);
  if (ids.length === 0) return [];

  const metadata = await Promise.all(ids.map((id) => getMessage(id, "metadata")));
  const fresh = metadata
    .filter((message) => message.internalDate > input.afterMs)
    .sort((a, b) => a.internalDate - b.internalDate)
    .slice(0, MAX_NEW_PER_POLL);
  if (fresh.length === 0) return [];

  return Promise.all(fresh.map((message) => getMessage(message.id, "full")));
}

/** Used to seed the polling cursor so the first poll does not replay old mail. */
export async function getNewestInternalDate(query: string): Promise<number> {
  const params = new URLSearchParams({ maxResults: "1" });
  if (query) params.set("q", query);

  const list = await getJson<{ messages?: { id: string }[] }>(`${BASE}/messages?${params.toString()}`);
  const id = list.messages?.[0]?.id;
  if (!id) return 0;

  const message = await getMessage(id, "metadata");
  return message.internalDate;
}

export type { GmailPayload };
