import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
export const FETCH_TIMEOUT_MS = 10_000;

const USER_AGENT = "DevDockBot/1.0 (+self-hosted)";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10/8
  [0x64400000, 0x647fffff], // 100.64/10 CGNAT
  [0x7f000000, 0x7fffffff], // 127/8 loopback
  [0xa9fe0000, 0xa9feffff], // 169.254/16 link-local
  [0xac100000, 0xac1fffff], // 172.16/12
  [0xc0a80000, 0xc0a8ffff], // 192.168/16
  [0xc0000000, 0xc00000ff], // 192.0.0/24
  [0xc0000200, 0xc00002ff], // 192.0.2/24 TEST-NET-1
  [0xc6120000, 0xc613ffff], // 198.18/15 benchmark
  [0xc6336400, 0xc63364ff], // 198.51.100/24 TEST-NET-2
  [0xcb007100, 0xcb0071ff], // 203.0.113/24 TEST-NET-3
  [0xe0000000, 0xffffffff], // multicast and reserved
];

function ipv4ToNumber(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8) + octet;
  }

  return value >>> 0;
}

function isPrivateIPv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return true;
  return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::" || value === "::1") return true;

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);

  if (value.startsWith("fc") || value.startsWith("fd")) return true; // fc00::/7
  if (/^fe[89ab]/.test(value)) return true; // fe80::/10
  if (value.startsWith("ff")) return true; // multicast
  if (value.startsWith("2001:db8")) return true; // documentation
  if (value.startsWith("64:ff9b")) return true; // NAT64

  return false;
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

/**
 * Validates a URL before fetching it. Only http/https is allowed and every
 * resolved address must be public.
 *
 * DNS is re-checked for every redirect. A determined attacker can still rebind
 * between this check and the connection; this guard covers the common cases
 * without pinning the socket.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Private addresses are not allowed");
  }

  // IP literals skip DNS, so check them directly.
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private addresses are not allowed");
    }
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new Error("Could not resolve host");
  }

  for (const entry of addresses) {
    if (isPrivateAddress(entry.address)) {
      throw new Error("Private addresses are not allowed");
    }
  }

  return url;
}

export interface FetchPublicResult {
  response: Response;
  finalUrl: string;
}

/** Fetches a public URL, following redirects manually so each hop is validated. */
export async function fetchPublicUrl(
  rawUrl: string,
  options: { maxRedirects?: number; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<FetchPublicResult> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  let current = rawUrl;

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const url = await assertPublicHttpUrl(current);
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: url.toString() };
      current = new URL(location, url).toString();
      continue;
    }

    return { response, finalUrl: url.toString() };
  }

  throw new Error(`Too many redirects (max ${maxRedirects})`);
}

/** Reads a response body as UTF-8 text, aborting when it exceeds `maxBytes`. */
export async function readBodyWithLimit(
  response: Response,
  maxBytes: number = MAX_BYTES,
): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Response is too large (max ${maxBytes} bytes)`);
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response is too large (max ${maxBytes} bytes)`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}
