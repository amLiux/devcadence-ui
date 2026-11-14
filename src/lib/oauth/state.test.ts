import { beforeEach, describe, expect, it } from "vitest";
import { STATE_TTL_MS, createOAuthState, verifyOAuthState } from "./state";

beforeEach(() => {
  process.env.DEVDOCK_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("createOAuthState / verifyOAuthState", () => {
  it("round trips the payload", () => {
    const state = createOAuthState({
      provider: "google",
      connectionId: "conn-1",
      returnTo: "/connections",
    });

    const payload = verifyOAuthState(state);

    expect(payload).not.toBeNull();
    expect(payload?.provider).toBe("google");
    expect(payload?.connectionId).toBe("conn-1");
    expect(payload?.returnTo).toBe("/connections");
    expect(payload?.nonce.length).toBeGreaterThan(0);
  });

  it("generates a different nonce per call", () => {
    const first = verifyOAuthState(
      createOAuthState({ provider: "google", connectionId: "", returnTo: "/" }),
    );
    const second = verifyOAuthState(
      createOAuthState({ provider: "google", connectionId: "", returnTo: "/" }),
    );

    expect(first?.nonce).not.toBe(second?.nonce);
  });

  it("rejects a tampered payload", () => {
    const state = createOAuthState({ provider: "google", connectionId: "", returnTo: "/" });
    const [encoded, signature] = state.split(".");
    const tampered = `${encoded.slice(0, -2)}AA.${signature}`;

    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const state = createOAuthState({ provider: "google", connectionId: "", returnTo: "/" });
    const [encoded] = state.split(".");

    expect(verifyOAuthState(`${encoded}.not-the-signature`)).toBeNull();
  });

  it("rejects a malformed state", () => {
    expect(verifyOAuthState("")).toBeNull();
    expect(verifyOAuthState("only-one-part")).toBeNull();
  });

  it("rejects an expired state", () => {
    const state = createOAuthState({ provider: "google", connectionId: "", returnTo: "/" });

    expect(verifyOAuthState(state, Date.now() + STATE_TTL_MS + 1)).toBeNull();
  });

  it("rejects a non-local returnTo to avoid an open redirect", () => {
    const state = createOAuthState({
      provider: "google",
      connectionId: "",
      returnTo: "https://evil.example",
    });

    expect(verifyOAuthState(state)).toBeNull();
  });
});
