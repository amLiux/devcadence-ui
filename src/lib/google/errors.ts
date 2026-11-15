/** Shared error mapping for Google APIs. Each service names itself in the message. */
export async function failGoogleRequest(
  response: Response,
  service: string,
  reconnectHint: string,
): Promise<never> {
  const body = await response.text();
  let detail = body;
  try {
    detail = JSON.parse(body)?.error?.message ?? body;
  } catch {
    // keep raw body
  }

  const quotaExceeded =
    /storage quota/i.test(detail) || /storageQuotaExceeded/.test(body);

  if (quotaExceeded) {
    throw new Error(
      `${service}: the Google account has no storage left. Free space in Drive/Gmail and retry.`,
    );
  }
  if (response.status === 401) {
    throw new Error("Google authorization expired. Reconnect the Google account.");
  }
  if (response.status === 403) {
    throw new Error(`${service} permission denied. ${reconnectHint} (${detail})`);
  }
  if (response.status === 404) {
    throw new Error(`${service}: the requested item was not found.`);
  }
  if (response.status === 429) {
    throw new Error(`${service} rate limit reached. Retry later.`);
  }
  throw new Error(`${service} API ${response.status}: ${detail}`);
}
