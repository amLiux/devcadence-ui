/**
 * Only allow local paths for post-login redirects. Rejects absolute URLs and
 * protocol-relative `//host`, which would turn login into an open redirect.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
