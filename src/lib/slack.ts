export interface SlackConfig {
  botToken: string;
}

export async function sendMessage(config: SlackConfig, channel: string, text: string, threadTs?: string) {
  const body: Record<string, string> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "Slack API request failed");
  }
  return data;
}
