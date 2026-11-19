export const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/oauth", "/api/webhooks"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function requiresLogin(pathname: string): boolean {
  return !isPublicPath(pathname);
}
