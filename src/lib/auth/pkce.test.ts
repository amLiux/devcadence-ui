import { describe, expect, it } from "vitest";
import { createPkcePair } from "./pkce";
import { sha256Base64Url } from "./encoding";

describe("createPkcePair", () => {
  it("returns an S256 challenge derived from the verifier", async () => {
    const pair = await createPkcePair();
    expect(pair.method).toBe("S256");
    expect(pair.verifier.length).toBeGreaterThan(40);
    expect(pair.challenge).toBe(await sha256Base64Url(pair.verifier));
    expect(pair.challenge).not.toContain("=");
    expect(pair.challenge).not.toContain("+");
    expect(pair.challenge).not.toContain("/");
  });

  it("generates a new verifier every time", async () => {
    const [a, b] = await Promise.all([createPkcePair(), createPkcePair()]);
    expect(a.verifier).not.toBe(b.verifier);
  });
});
