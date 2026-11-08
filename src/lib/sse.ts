/**
 * Reads a server-sent-events response and calls `onMessage` for every JSON
 * payload. Lines that are blank, comments or malformed JSON are skipped.
 */
export async function readSseEvents<T>(
  response: Response,
  onMessage: (message: T) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
      try {
        onMessage(JSON.parse(data) as T);
      } catch {
        // Skip malformed events.
      }
    }

    if (done) break;
  }
}
