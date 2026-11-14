import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getMasterKey } from "@/lib/secrets";

/** A consent round trip should take seconds; ten minutes is generous without being a replay window. */
export const STATE_TTL_MS = 10 * 60_000;

export interface OAuthStatePayload {
  provider: string;
  /** Empty on create, the connection id on reconnect. */
  connectionId: string;
  /** In-app path to return to after the callback. */
  returnTo: string;
  /** Optional display name for the connection being created. */
  name: string;
  /** Services selected in the form, turned into scopes. */
  services: string[];
  issuedAt: number;
  nonce: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getMasterKey()).update(encodedPayload).digest("base64url");
}

export function createOAuthState(
  input: Omit<OAuthStatePayload, "issuedAt" | "nonce" | "name" | "services"> &
    Partial<Pick<OAuthStatePayload, "name" | "services">>,
): string {
  const payload: OAuthStatePayload = {
    name: "",
    services: [],
    ...input,
    issuedAt: Date.now(),
    nonce: randomBytes(12).toString("base64url"),
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function parsedPayload(value: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed?.provider !== "string" || !parsed.provider) return null;
    if (typeof parsed?.issuedAt !== "number") return null;
    if (typeof parsed?.returnTo !== "string" || !parsed.returnTo.startsWith("/")) return null;
    return {
      provider: parsed.provider,
      connectionId: typeof parsed.connectionId === "string" ? parsed.connectionId : "",
      returnTo: parsed.returnTo,
      name: typeof parsed.name === "string" ? parsed.name : "",
      services: Array.isArray(parsed.services)
        ? parsed.services.filter((value: unknown): value is string => typeof value === "string")
        : [],
      issuedAt: parsed.issuedAt,
      nonce: typeof parsed.nonce === "string" ? parsed.nonce : "",
    };
  } catch {
    return null;
  }
}

/** Returns the payload only for a well-formed, correctly signed and unexpired state. */
export function verifyOAuthState(state: string, now = Date.now()): OAuthStatePayload | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  const payload = parsedPayload(encoded);
  if (!payload) return null;
  if (now - payload.issuedAt > STATE_TTL_MS) return null;
  return payload;
}
