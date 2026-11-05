import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  smtpClose: vi.fn(),
  createTransporter: vi.fn(),
  poolQuery: vi.fn(),
  poolEnd: vi.fn(),
  pool: vi.fn(),
}));

vi.mock("@/lib/smtp", () => ({
  createSmtpTransporter: mocks.createTransporter,
}));

vi.mock("pg", () => ({
  Pool: mocks.pool,
}));

import { isTestable, scrubSecrets, testConnectionConfig } from "./test";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  mocks.verify.mockReset();
  mocks.smtpClose.mockReset();
  mocks.createTransporter.mockReset().mockReturnValue({
    verify: mocks.verify,
    close: mocks.smtpClose,
  });
  mocks.poolQuery.mockReset();
  mocks.poolEnd.mockReset();
  mocks.pool.mockReset().mockImplementation(function () {
    return { query: mocks.poolQuery, end: mocks.poolEnd };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isTestable", () => {
  it("accepts the provider-backed types", () => {
    for (const type of ["GitHub", "Slack", "Discord", "SMTP", "PostgreSQL", "AI"]) {
      expect(isTestable(type)).toBe(true);
    }
  });

  it("rejects types without a probe", () => {
    expect(isTestable("Webhook")).toBe(false);
    expect(isTestable("Gmail")).toBe(false);
  });
});

describe("scrubSecrets", () => {
  it("replaces token, password and key values", () => {
    const config = { botToken: "xoxb-secret-value", password: "hunter2", host: "db.local" };
    const message = "Request failed with xoxb-secret-value and hunter2 on db.local";

    expect(scrubSecrets(message, config)).toBe(
      "Request failed with *** and *** on db.local",
    );
  });

  it("ignores short values", () => {
    expect(scrubSecrets("abc", { token: "abc" })).toBe("abc");
  });
});

describe("GitHub probe", () => {
  it("reports the authenticated login", async () => {
    mockFetch(jsonResponse({ login: "amLiux" }));

    const result = await testConnectionConfig({
      type: "GitHub",
      config: { patToken: "ghp_token" },
    });

    expect(result).toMatchObject({ ok: true, message: "Authenticated as amLiux" });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports the HTTP status when rejected", async () => {
    mockFetch(jsonResponse({}, false, 401));

    const result = await testConnectionConfig({
      type: "GitHub",
      config: { patToken: "ghp_token" },
    });

    expect(result).toMatchObject({ ok: false, message: "GitHub responded with 401" });
  });

  it("fails fast without a token", async () => {
    const fetchMock = mockFetch(jsonResponse({}));

    const result = await testConnectionConfig({ type: "GitHub", config: {} });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Personal Access Token");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Slack probe", () => {
  it("surfaces the Slack error code", async () => {
    mockFetch(jsonResponse({ ok: false, error: "invalid_auth" }));

    const result = await testConnectionConfig({
      type: "Slack",
      config: { botToken: "xoxb-token" },
    });

    expect(result).toMatchObject({ ok: false, message: "Slack: invalid_auth" });
  });

  it("reports the workspace on success", async () => {
    mockFetch(jsonResponse({ ok: true, team: "DevCadence" }));

    const result = await testConnectionConfig({
      type: "Slack",
      config: { botToken: "xoxb-token" },
    });

    expect(result).toMatchObject({ ok: true, message: "Connected to DevCadence" });
  });
});

describe("Discord probe", () => {
  it("reports the bot username", async () => {
    mockFetch(jsonResponse({ username: "devdock" }));

    const result = await testConnectionConfig({
      type: "Discord",
      config: { botToken: "discord-token" },
    });

    expect(result).toMatchObject({ ok: true, message: "Bot @devdock" });
  });
});

describe("SMTP probe", () => {
  it("verifies the transporter and always closes it", async () => {
    mocks.verify.mockResolvedValue(true);

    const result = await testConnectionConfig({
      type: "SMTP",
      config: { host: "smtp.test", port: "587", fromEmail: "a@test.dev" },
    });

    expect(result.ok).toBe(true);
    expect(mocks.verify).toHaveBeenCalled();
    expect(mocks.smtpClose).toHaveBeenCalled();
  });

  it("closes the transporter even when verification fails", async () => {
    mocks.verify.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await testConnectionConfig({
      type: "SMTP",
      config: { host: "smtp.test", port: "587", fromEmail: "a@test.dev" },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("ECONNREFUSED");
    expect(mocks.smtpClose).toHaveBeenCalled();
  });

  it("fails fast without a host", async () => {
    const result = await testConnectionConfig({ type: "SMTP", config: {} });

    expect(result.ok).toBe(false);
    expect(mocks.createTransporter).not.toHaveBeenCalled();
  });
});

describe("PostgreSQL probe", () => {
  it("runs a cheap query and closes the pool", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ "?column?": 1 }] });

    const result = await testConnectionConfig({
      type: "PostgreSQL",
      config: { host: "db.local", port: "5432", database: "devdock", user: "u", password: "p" },
    });

    expect(result.ok).toBe(true);
    expect(mocks.poolQuery).toHaveBeenCalledWith("SELECT 1");
    expect(mocks.poolEnd).toHaveBeenCalled();
  });

  it("closes the pool when the query fails", async () => {
    mocks.poolQuery.mockRejectedValue(new Error("password authentication failed"));

    const result = await testConnectionConfig({
      type: "PostgreSQL",
      config: { host: "db.local", database: "devdock", user: "u", password: "p" },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("password authentication failed");
    expect(mocks.poolEnd).toHaveBeenCalled();
  });
});

describe("AI probe", () => {
  it("validates an OpenAI key against the models endpoint", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [] }));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "openai", apiKey: "sk-test" },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({ headers: { Authorization: "Bearer sk-test" } }),
    );
  });

  it("validates a Claude key against the models endpoint", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [] }));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "claude", apiKey: "sk-ant-test" },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        headers: { "x-api-key": "sk-ant-test", "anthropic-version": "2023-06-01" },
      }),
    );
  });

  it("validates a DeepSeek key against its models endpoint", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [] }));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "deepseek", apiKey: "sk-deep" },
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("DeepSeek key valid");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/models",
      expect.objectContaining({ headers: { Authorization: "Bearer sk-deep" } }),
    );
  });

  it("probes a custom endpoint with no key", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [{ id: "llama3.1" }] }));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "custom", baseUrl: "http://localhost:11434/v1/", model: "llama3.1" },
    });

    expect(result).toMatchObject({
      ok: true,
      message: "Endpoint reachable at http://localhost:11434/v1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.objectContaining({ headers: {} }),
    );
  });

  it("sends the key to a custom endpoint when one is configured", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [] }));

    await testConnectionConfig({
      type: "AI",
      config: { provider: "custom", baseUrl: "https://llm.internal/v1", apiKey: "sk-local" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://llm.internal/v1/models",
      expect.objectContaining({ headers: { Authorization: "Bearer sk-local" } }),
    );
  });

  it("requires a URL for a custom endpoint", async () => {
    const fetchMock = mockFetch(jsonResponse({ data: [] }));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "custom" },
    });

    expect(result).toMatchObject({
      ok: false,
      message: "Base URL is required for a custom endpoint",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a key for hosted providers", async () => {
    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "deepseek" },
    });

    expect(result).toMatchObject({ ok: false, message: "API Key is missing" });
  });

  it("reports a rejected key", async () => {
    mockFetch(jsonResponse({}, false, 401));

    const result = await testConnectionConfig({
      type: "AI",
      config: { provider: "openai", apiKey: "sk-bad" },
    });

    expect(result).toMatchObject({ ok: false, message: "OpenAI responded with 401" });
  });
});

describe("unsupported and unexpected failures", () => {
  it("rejects connection types without a probe", async () => {
    const result = await testConnectionConfig({ type: "Webhook", config: {} });

    expect(result).toMatchObject({ ok: false, latencyMs: 0 });
    expect(result.message).toContain("cannot be tested");
  });

  it("turns thrown errors into a scrubbed result", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("network blew up");
      },
    } as unknown as Response);

    const result = await testConnectionConfig({
      type: "GitHub",
      config: { patToken: "ghp_token" },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("network blew up");
  });
});
