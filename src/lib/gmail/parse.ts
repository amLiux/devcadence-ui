export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailPayload[];
}

export interface RawGmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  internalDate: number;
}

export function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectBody(payload: GmailPayload | undefined): { text: string; html: string } {
  if (!payload) return { text: "", html: "" };

  const own = payload.body?.data ? decodeBase64Url(payload.body.data) : "";
  if (own) {
    if (payload.mimeType === "text/html") return { text: "", html: own };
    if (payload.mimeType === "text/plain") return { text: own, html: "" };
  }

  let text = "";
  let html = "";
  for (const part of payload.parts ?? []) {
    const nested = collectBody(part);
    if (!text && nested.text) text = nested.text;
    if (!html && nested.html) html = nested.html;
  }
  return { text, html };
}

/** Prefers text/plain and falls back to a naive HTML to text conversion. */
export function parseGmailMessage(raw: RawGmailMessage): GmailMessage {
  const headers = raw.payload?.headers;
  const body = collectBody(raw.payload);
  const internalDate = Number(raw.internalDate);

  return {
    id: raw.id,
    threadId: raw.threadId,
    from: headerValue(headers, "From"),
    to: headerValue(headers, "To"),
    subject: headerValue(headers, "Subject"),
    date: headerValue(headers, "Date"),
    snippet: raw.snippet ?? "",
    body: body.text || htmlToText(body.html),
    labelIds: raw.labelIds ?? [],
    internalDate: Number.isFinite(internalDate) ? internalDate : 0,
  };
}
