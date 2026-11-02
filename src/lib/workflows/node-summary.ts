type Meta = Record<string, string>;

export interface SummaryOptions {
  /** id → name lookup for Call Workflow targets, so renames show up live. */
  workflowNames?: Record<string, string>;
}

type Summarizer = (meta: Meta, options: SummaryOptions) => string | null;

/** Hard character cap for a card preview, independent of the rendered width. */
export const MAX_PREVIEW_CHARS = 60;

/** Collapses whitespace so multi-line values fit on a single card line. */
function collapse(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Shortens opaque identifiers (Slack ids, Discord snowflakes) for display. */
function shortenId(value: string, keep = 6): string {
  return value.length > keep + 3 ? `${value.slice(0, keep)}…` : value;
}

/** Appends the configured output name, when the node defines one. */
function withOutput(summary: string | null, meta: Meta): string | null {
  const outputName = collapse(meta.outputName);
  if (!summary) return outputName || null;
  return outputName ? `${summary} → ${outputName}` : summary;
}

/** Slack accepts either a channel name (#general) or a channel id (C1234567890). */
function formatSlackChannel(value: string | undefined): string | null {
  const raw = collapse(value).replace(/^#/, "");
  if (!raw) return null;
  if (/^[CGD][A-Z0-9]{8,}$/i.test(raw)) return `#${shortenId(raw)}`;
  return `#${raw}`;
}

/** Discord channels are always numeric snowflakes, so they are always shortened. */
function formatDiscordChannel(value: string | undefined): string | null {
  const raw = collapse(value).replace(/^#/, "");
  if (!raw) return null;
  return `#${shortenId(raw)}`;
}

/**
 * One summarizer per node title. Each returns a single-line preview of what the
 * node is configured to do, or null when nothing meaningful is set yet.
 *
 * Only display-safe fields are read — never headers, bodies, tokens or
 * connection ids.
 */
const SUMMARIZERS: Record<string, Summarizer> = {
  Conditional: (meta) => {
    const expression = collapse(meta.expression);
    return withOutput(expression ? `if ${expression}` : null, meta);
  },

  "Transform Data": (meta) => {
    const expression = collapse(meta.expression);
    return withOutput(expression || null, meta);
  },

  "Call Workflow": (meta, options) => {
    const workflowId = collapse(meta.workflowId);
    const name =
      (workflowId && options.workflowNames?.[workflowId]) ||
      collapse(meta.workflowName) ||
      workflowId;
    return name ? `→ ${name}` : null;
  },

  "HTTP Request": (meta) => {
    const url = collapse(meta.url);
    if (!url) return null;
    return `${(meta.method || "GET").toUpperCase()} ${url}`;
  },

  "Send Slack Message": (meta) => {
    const channel = formatSlackChannel(meta.channel);
    const text = collapse(meta.text);
    if (channel && text) return `${channel} · ${cap(text, 60)}`;
    return channel ?? (text ? `"${cap(text, 60)}"` : null);
  },

  "Send Email": (meta) => {
    const to = collapse(meta.to);
    const subject = collapse(meta.subject);
    if (to && subject) return `${to} · "${cap(subject, 60)}"`;
    if (to) return to;
    return subject ? `"${cap(subject, 60)}"` : null;
  },

  "PostgreSQL Query": (meta) => {
    const sql = collapse(meta.sql);
    return sql ? cap(sql, 120) : null;
  },

  "PostgreSQL Insert": (meta) => collapse(meta.table) || null,

  "PostgreSQL Update": (meta) => collapse(meta.table) || null,

  "PostgreSQL Delete": (meta) => collapse(meta.table) || null,

  "Send Discord Message": (meta) => {
    const channel = formatDiscordChannel(meta.channelId);
    const content = collapse(meta.content);
    if (channel && content) return `${channel} · ${cap(content, 60)}`;
    return channel ?? (content ? `"${cap(content, 60)}"` : null);
  },

  "Read Discord Messages": (meta) => {
    const channel = formatDiscordChannel(meta.channelId);
    const limit = collapse(meta.limit);
    if (channel && limit) return `${channel} · last ${limit}`;
    return channel ?? (limit ? `last ${limit}` : null);
  },

  "Send Direct Message": (meta) => {
    const user = collapse(meta.userId);
    const content = collapse(meta.content);
    if (user && content) return `@${shortenId(user)} · ${cap(content, 60)}`;
    if (user) return `@${shortenId(user)}`;
    return content ? `"${cap(content, 60)}"` : null;
  },

  Prompt: (meta) => {
    const prompt = collapse(meta.prompt);
    return prompt ? cap(prompt, 100) : null;
  },

  Classify: (meta) => {
    const categories = collapse(meta.categories);
    return categories || null;
  },

  Extract: (meta) => {
    const fields = collapse(meta.fields);
    return fields || null;
  },
};

/**
 * Builds the one-line preview rendered on a node card.
 *
 * Returns null when the node type has no summarizer or when the relevant
 * metadata is still empty, so callers can fall back to the palette description.
 */
export function summarizeNode(
  meta: Meta | undefined,
  title: string,
  options: SummaryOptions = {},
): string | null {
  if (!meta) return null;
  const summarizer = SUMMARIZERS[title];
  if (!summarizer) return null;
  try {
    const summary = summarizer(meta, options);
    return summary && summary.trim() ? cap(summary.trim(), MAX_PREVIEW_CHARS) : null;
  } catch {
    return null;
  }
}
