/**
 * base64url / UTF-8 helpers shared by PKCE, JWT parsing and cookie signing.
 *
 * Kept on Web APIs (btoa/atob, TextEncoder, crypto.getRandomValues) so the same
 * module works in Node route handlers and in the proxy runtime. Encoded values
 * have no `=` padding, matching RFC 7515 (JOSE) and RFC 7636 (PKCE).
 *
 * These helpers are for text and small byte arrays, not file/binary handling.
 */
const encoder = new TextEncoder();

/** Encode bytes as unpadded base64url (RFC 4648 §5). */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode unpadded base64url back to bytes. */
export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeUtf8(value: string): Uint8Array {
  return encoder.encode(value);
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Cryptographically random, URL-safe token.
 *
 * Uses the platform CSPRNG (`crypto.getRandomValues`), never Math.random.
 * Default 32 bytes = 256 bits of entropy, suitable for state, nonce and
 * authorization-code-like values.
 */
export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return toBase64Url(buffer);
}

/** SHA-256 over a UTF-8 string, returned as unpadded base64url (PKCE S256). */
export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encodeUtf8(value) as BufferSource);
  return toBase64Url(new Uint8Array(digest));
}
