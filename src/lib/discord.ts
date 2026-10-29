export interface DiscordConfig {
  botToken: string;
}

export interface SendDiscordMessageOptions {
  channelId: string;
  content: string;
  embeds?: Record<string, unknown>[];
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    globalName?: string | null;
    bot?: boolean;
  };
}

export interface ReadDiscordMessagesOptions {
  channelId: string;
  limit?: number;
  after?: string;
}

export interface SendDirectMessageOptions {
  userId: string;
  content: string;
}

function discordRequest(config: DiscordConfig, path: string, init?: RequestInit) {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${config.botToken}`,
      ...init?.headers,
    },
  });
}

export async function sendDiscordMessage(config: DiscordConfig, options: SendDiscordMessageOptions) {
  const body: Record<string, unknown> = { content: options.content };
  if (options.embeds && options.embeds.length > 0) {
    body.embeds = options.embeds;
  }

  const response = await discordRequest(config, `/channels/${options.channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `Discord API error: ${response.status}`;
    throw new Error(message);
  }

  return {
    id: data.id as string,
    channelId: data.channel_id as string,
    content: data.content as string,
  };
}

function resolveAfter(after?: string): string | undefined {
  if (!after) return undefined;
  if (/^\d{17,20}$/.test(after)) return after;
  return undefined;
}

export async function getChannelMessages(config: DiscordConfig, options: ReadDiscordMessagesOptions): Promise<DiscordMessage[]> {
  const params = new URLSearchParams();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  params.append("limit", String(limit));

  const after = resolveAfter(options.after);
  if (after) params.append("after", after);

  const response = await discordRequest(config, `/channels/${options.channelId}/messages?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `Discord API error: ${response.status}`;
    throw new Error(message);
  }

  if (!Array.isArray(data)) return [];
  return data.map((msg: Record<string, unknown>) => ({
    id: msg.id as string,
    channelId: msg.channel_id as string,
    content: msg.content as string,
    timestamp: msg.timestamp as string,
    author: {
      id: (msg.author as Record<string, unknown>)?.id as string,
      username: (msg.author as Record<string, unknown>)?.username as string,
      globalName: (msg.author as Record<string, unknown>)?.global_name as string | undefined,
      bot: (msg.author as Record<string, unknown>)?.bot as boolean | undefined,
    },
  }));
}

export async function sendDirectMessage(config: DiscordConfig, options: SendDirectMessageOptions) {
  const dmResponse = await discordRequest(config, "/users/@me/channels", {
    method: "POST",
    body: JSON.stringify({ recipient_id: options.userId }),
  });
  const dmData = await dmResponse.json().catch(() => ({}));
  if (!dmResponse.ok) {
    const message = dmData?.message || `Discord API error: ${dmResponse.status}`;
    throw new Error(message);
  }
  const channelId = dmData.id as string;
  return sendDiscordMessage(config, { channelId, content: options.content });
}
