import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectionsPage from "./page";

const slackConnection = {
  id: "conn-1",
  type: "Slack",
  name: "Team Slack",
  description: "Notifications",
  config: { botToken: "xoxb-token" },
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

function json(body: unknown) {
  return { ok: true, json: async () => body };
}

function mockFetch(testResult: unknown) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/test")) return json(testResult);
    if (init?.method && init.method !== "GET") return json({});
    return json([slackConnection]);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ConnectionsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a Test action only for testable connections", async () => {
    mockFetch({ ok: true, latencyMs: 20, message: "Connected to DevCadence" });

    render(<ConnectionsPage />);

    expect(await screen.findByRole("button", { name: /test team slack/i })).toBeInTheDocument();
  });

  it("runs the probe and shows the result inline", async () => {
    const fetchMock = mockFetch({
      ok: true,
      latencyMs: 42,
      message: "Connected to DevCadence",
    });

    render(<ConnectionsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /test team slack/i }));

    expect(await screen.findByText("Connected to DevCadence")).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connections/conn-1/test",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a failed probe without breaking the page", async () => {
    mockFetch({ ok: false, latencyMs: 15, message: "Slack: invalid_auth" });

    render(<ConnectionsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /test team slack/i }));

    expect(await screen.findByText("Slack: invalid_auth")).toBeInTheDocument();
  });
});
