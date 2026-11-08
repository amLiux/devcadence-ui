const SECRET_KEYS = new Set(
  [
    "password", "token", "secret", "key", "apikey", "api_key",
    "authorization", "access_key", "private_key", "auth_token",
    "bearer", "x-api-key", "x-auth-token",
  ].map((key) => key.toLowerCase().replace(/-/g, "_")),
);

const PII_PATTERNS = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
];

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key.toLowerCase().replace(/-/g, "_"));
}

export interface SanitizeResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitized: any;
  redactedCount: number;
  redactedPaths: string[];
}

function emptyResult(): SanitizeResult {
  return { sanitized: undefined, redactedCount: 0, redactedPaths: [] };
}

function sanitizeString(
  value: string,
  strict: boolean,
  path: string,
  result: SanitizeResult,
): void {
  let sanitized = value;
  if (!strict) {
    result.sanitized = sanitized;
    return;
  }

  let matched = false;
  for (const pattern of PII_PATTERNS) {
    const replaced = sanitized.replace(pattern, "[REDACTED]");
    if (replaced !== sanitized) matched = true;
    sanitized = replaced;
  }
  if (matched) {
    result.redactedCount++;
    result.redactedPaths.push(path);
  }
  result.sanitized = sanitized;
}

function sanitizeArray(
  value: unknown[],
  strict: boolean,
  path: string,
  result: SanitizeResult,
): void {
  const sanitized: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const child = sanitize(value[index], strict, `${path}[${index}]`, undefined);
    sanitized.push(child.sanitized);
    result.redactedCount += child.redactedCount;
    result.redactedPaths.push(...child.redactedPaths);
  }
  result.sanitized = sanitized;
}

function sanitizeObject(
  value: Record<string, unknown>,
  strict: boolean,
  path: string,
  result: SanitizeResult,
): void {
  const sanitized: Record<string, unknown> = {};
  for (const [key, childValue] of Object.entries(value)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (isSecretKey(key)) {
      sanitized[key] = "[REDACTED]";
      result.redactedCount++;
      result.redactedPaths.push(fullPath);
      continue;
    }

    const child = sanitize(childValue, strict, fullPath, undefined);
    sanitized[key] = child.sanitized;
    result.redactedCount += child.redactedCount;
    result.redactedPaths.push(...child.redactedPaths);
  }
  result.sanitized = sanitized;
}

export function sanitize(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  strict = false,
  path = "",
  result?: SanitizeResult,
): SanitizeResult {
  const output = result ?? emptyResult();

  if (value === null || value === undefined) {
    output.sanitized = value;
    return output;
  }

  if (typeof value === "string") {
    sanitizeString(value, strict, path, output);
    return output;
  }

  if (typeof value !== "object") {
    output.sanitized = value;
    return output;
  }

  if (Array.isArray(value)) {
    sanitizeArray(value, strict, path, output);
  } else {
    sanitizeObject(value as Record<string, unknown>, strict, path, output);
  }

  return output;
}
