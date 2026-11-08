import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertPublicHttpUrl,
  fetchPublicUrl,
  isPrivateAddress,
  readBodyWithLimit,
} from "./safe-fetch";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

const publicAddress = { address: "93.184.216.34", family: 4 };

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([publicAddress]);
});

describe("isPrivateAddress", () => {
  it("blocks loopback, private, link-local and CGNAT ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("allows public IPv4 addresses", () => {
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("172.32.0.1")).toBe(false);
  });

  it("blocks private IPv6 ranges and IPv4-mapped loopback", () => {
    for (const address of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "2001:db8::1"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IPv6 addresses", () => {
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
  });
});

describe("assertPublicHttpUrl", () => {
  it("rejects non-http protocols", async () => {
    await expect(assertPublicHttpUrl("ftp://example.com/file")).rejects.toThrow(
      "Only http and https URLs are allowed",
    );
  });

  it("rejects localhost without resolving it", async () => {
    await expect(assertPublicHttpUrl("http://localhost:3000")).rejects.toThrow(
      "Private addresses are not allowed",
    );
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects hostnames that resolve to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

    await expect(assertPublicHttpUrl("https://internal.example.com")).rejects.toThrow(
      "Private addresses are not allowed",
    );
  });

  it("accepts a hostname that resolves to a public address", async () => {
    const url = await assertPublicHttpUrl("https://example.com/article");

    expect(url.toString()).toBe("https://example.com/article");
  });
});

describe("fetchPublicUrl", () => {
  it("revalidates every redirect and rejects a hop to a private address", async () => {
    lookupMock.mockImplementation((host: string) =>
      host === "10.0.0.1"
        ? Promise.resolve([{ address: "10.0.0.1", family: 4 }])
        : Promise.resolve([publicAddress]),
    );
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://10.0.0.1/secret" },
      }),
    );

    await expect(
      fetchPublicUrl("https://example.com", { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("Private addresses are not allowed");
  });

  it("stops after the redirect limit", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/again" },
      }),
    );

    await expect(
      fetchPublicUrl("https://example.com", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        maxRedirects: 2,
      }),
    ).rejects.toThrow("Too many redirects");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("readBodyWithLimit", () => {
  it("returns the body when it fits", async () => {
    await expect(readBodyWithLimit(new Response("hello"), 10)).resolves.toBe("hello");
  });

  it("throws when the body exceeds the cap", async () => {
    await expect(readBodyWithLimit(new Response("hello world"), 5)).rejects.toThrow(
      "Response is too large",
    );
  });

  it("throws before reading when content-length is too large", async () => {
    const response = new Response("small", { headers: { "content-length": "999" } });

    await expect(readBodyWithLimit(response, 10)).rejects.toThrow("Response is too large");
  });
});
