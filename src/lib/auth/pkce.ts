/**
 * RFC 7636 PKCE (Proof Key for Code Exchange).
 *
 * The verifier is a high-entropy random string kept in the signed transaction
 * cookie. Only its SHA-256 challenge travels through the authorization URL, so
 * an attacker who intercepts the redirect cannot redeem the code. The token
 * exchange sends the verifier again, and the provider compares the two.
 *
 * We only support S256. `plain` is not offered: it gives no real protection if
 * the redirect is intercepted, which is the exact threat PKCE solves.
 */
import { randomToken, sha256Base64Url } from "./encoding";

export interface PkcePair {
  /** Secret kept server-side (inside the signed transaction cookie). */
  verifier: string;
  /** Public value sent to the provider in the authorize URL. */
  challenge: string;
  method: "S256";
}

/**
 * Generate a verifier/challenge pair. The verifier is 48 random bytes encoded
 * as base64url, well above the RFC minimum of 43 characters.
 */
export async function createPkcePair(): Promise<PkcePair> {
  const verifier = randomToken(48);
  return {
    verifier,
    challenge: await sha256Base64Url(verifier),
    method: "S256",
  };
}
