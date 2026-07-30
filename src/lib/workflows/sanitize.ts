const SECRET_KEYS = new Set([
  "password", "token", "secret", "key", "apikey", "api_key",
  "authorization", "access_key", "private_key", "auth_token",
  "bearer", "x-api-key", "x-auth-token",
]);

const PII_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

function isSecretKey(k: string): boolean {
  return SECRET_KEYS.has(k.toLowerCase().replace(/-/g, "_"));
}

export interface SanitizeResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitized: any;
  redactedCount: number;
  redactedPaths: string[];
}

export function sanitize(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  strict = false,
  path = "",
  result?: SanitizeResult,
): SanitizeResult {
  if (!result) result = { sanitized: undefined, redactedCount: 0, redactedPaths: [] };

  if (value === null || value === undefined) {
    result.sanitized = value;
    return result;
  }

  if (typeof value === "string") {
    let sanitized = value;
    if (strict) {
      for (const pattern of PII_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
        if (sanitized !== value) {
          result!.redactedCount++;
          result!.redactedPaths.push(path);
        }
      }
    }
    result.sanitized = sanitized;
    return result;
  }

  if (typeof value !== "object") {
    result.sanitized = value;
    return result;
  }

  if (Array.isArray(value)) {
    const arr: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const child = sanitize(value[i], strict, `${path}[${i}]`, undefined);
      arr.push(child.sanitized);
      result.redactedCount += child.redactedCount;
      result.redactedPaths.push(...child.redactedPaths);
    }
    result.sanitized = arr;
    return result;
  }

  const obj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const fullPath = path ? `${path}.${k}` : k;
    if (isSecretKey(k)) {
      obj[k] = "[REDACTED]";
      result.redactedCount++;
      result.redactedPaths.push(fullPath);
    } else {
      const child = sanitize(v, strict, fullPath, undefined);
      obj[k] = child.sanitized;
      result.redactedCount += child.redactedCount;
      result.redactedPaths.push(...child.redactedPaths);
    }
  }
  result.sanitized = obj;
  return result;
}
