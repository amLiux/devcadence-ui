/**
 * Connection config is encrypted at rest but still must not reach the browser.
 * These helpers keep the secret values server-side and expose a placeholder
 * that only signals "a value exists".
 */

export const SECRET_PLACEHOLDER = "__devdock_stored_secret__";

/**
 * Suffix match rather than exact match: the existing connection types use
 * botToken, patToken, apiKey, privateKey, clientSecret and password, and a new
 * provider should not leak a secret just because its key is not in a list.
 * tokenType and expiresAt stay readable on purpose.
 */
const SECRET_KEY_PATTERN = /(password|passwd|secret|token|api_?key|private_?key|authorization|credential)$/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

export function redactConfig(config: Record<string, unknown>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, raw] of Object.entries(config)) {
    const value = stringifyValue(raw);
    if (value === null) continue;
    redacted[key] = isSecretKey(key) && value !== "" ? SECRET_PLACEHOLDER : value;
  }
  return redacted;
}

/**
 * Replaces placeholders coming back from the edit form with the stored value.
 * A placeholder with nothing stored is dropped, so it can never be persisted.
 */
export function resolveRedactedConfig(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, raw] of Object.entries(incoming)) {
    const value = stringifyValue(raw);
    if (value === null) continue;
    if (value === SECRET_PLACEHOLDER) {
      const previous = stringifyValue(existing[key]);
      if (previous) resolved[key] = previous;
      continue;
    }
    resolved[key] = value;
  }
  return resolved;
}
