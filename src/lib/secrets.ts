import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getMasterKey(): Buffer {
  const envKey = process.env.DEVDOCK_MASTER_KEY;
  if (!envKey) {
    throw new Error("DEVDOCK_MASTER_KEY is not set");
  }
  // Support base64-encoded 32-byte key or arbitrary passphrase (hashed to 32 bytes)
  if (envKey.length === 44) {
    return Buffer.from(envKey, "base64");
  }
  return createHash("sha256").update(envKey).digest();
}

export function hasMasterKey(): boolean {
  return !!process.env.DEVDOCK_MASTER_KEY;
}

export function encryptString(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + combined.toString("base64");
}

export function decryptString(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    // Plaintext fallback during transition; remove once all configs are encrypted
    return ciphertext;
  }
  const key = getMasterKey();
  const buf = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 16);
  const authTag = buf.subarray(16, 32);
  const encrypted = buf.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function encryptConfig(config: Record<string, unknown>): string {
  return encryptString(JSON.stringify(config));
}

export function decryptConfig(stored: unknown): Record<string, unknown> {
  if (typeof stored !== "string") {
    // Plain object fallback during transition
    return (stored ?? {}) as Record<string, unknown>;
  }
  const decrypted = decryptString(stored);
  return JSON.parse(decrypted);
}
