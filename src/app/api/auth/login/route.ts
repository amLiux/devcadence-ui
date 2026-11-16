import { NextResponse } from "next/server";
import { randomToken } from "@/lib/auth/encoding";
import {
  buildAuthorizeUrl,
  getDiscovery,
} from "@/lib/auth/oidc";
import { createPkcePair } from "@/lib/auth/pkce";
import {
  TRANSACTION_COOKIE,
  createTransactionToken,
  transactionCookieOptions,
} from "@/lib/auth/session";
import { getAuthConfig, isAuthEnabled } from "@/lib/auth/config";

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthEnabled()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const config = getAuthConfig();
    const discovery = await getDiscovery(config);
    const state = randomToken(24);
    const nonce = randomToken(24);
    const pkce = await createPkcePair();
    const url = new URL(request.url);
    const returnTo = safeReturnTo(url.searchParams.get("next"));

    const transaction = await createTransactionToken(
      { state, nonce, verifier: pkce.verifier, returnTo },
      config,
    );
    const redirectUrl = buildAuthorizeUrl(config, discovery, {
      state,
      nonce,
      codeChallenge: pkce.challenge,
    });

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(TRANSACTION_COOKIE, transaction, transactionCookieOptions(config));
    return response;
  } catch (error) {
    console.error("GET /api/auth/login error:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }
}
