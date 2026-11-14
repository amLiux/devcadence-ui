import { NextResponse } from "next/server";

/** Only same-origin paths are valid destinations after the callback. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value) return "/connections";
  if (!value.startsWith("/") || value.startsWith("//")) return "/connections";
  return value;
}

export function oauthRedirect(input: {
  origin: string;
  returnTo: string;
  params?: Record<string, string>;
}): NextResponse {
  const url = new URL(safeReturnTo(input.returnTo), input.origin);
  for (const [key, value] of Object.entries(input.params ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export function oauthErrorRedirect(input: {
  origin: string;
  returnTo: string;
  code: string;
}): NextResponse {
  return oauthRedirect({
    origin: input.origin,
    returnTo: input.returnTo,
    params: { oauth_error: input.code },
  });
}
