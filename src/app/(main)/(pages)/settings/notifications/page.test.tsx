import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsSettingsPage from "./page";

const settings = {
  enabled: true,
  channel: "slack",
  connectionId: "conn-slack",
  target: "#alerts",
  throttleMinutes: 60,
};

const connections = [
  {
    id: "conn-slack",
    type: "Slack",
    name: "Team Slack",
    description: "",
    config: {},
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "conn-mail",
    type: "SMTP",
    name: "Mail",
    description: "",
    config: {},
    createdAt: "",
    updatedAt: "",
  },
];

function json(body: unknown) {
  return { ok: true, json: async () => body };
}

function mockFetch() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/test")) return json({ success: true });
    if (url === "/api/connections") return json(connections);
    if (init?.method === "PUT") return json(JSON.parse(init.body as string));
    return json(settings);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("NotificationsSettingsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the saved settings and the matching connection", async () => {
    mockFetch();

    render(<NotificationsSettingsPage />);

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("#alerts")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Team Slack" })).toBeInTheDocument();
    // Only Slack connections are offered for the Slack channel.
    expect(screen.queryByRole("option", { name: "Mail" })).not.toBeInTheDocument();
  });

  it("links back to the settings hub", () => {
    mockFetch();

    render(<NotificationsSettingsPage />);

    expect(screen.getByRole("link", { name: /back to settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("saves the form", async () => {
    const fetchMock = mockFetch();

    render(<NotificationsSettingsPage />);
    await screen.findByDisplayValue("#alerts");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/notifications",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("saves before sending a test", async () => {
    const fetchMock = mockFetch();

    render(<NotificationsSettingsPage />);
    await screen.findByDisplayValue("#alerts");

    await userEvent.click(screen.getByRole("button", { name: /send test/i }));

    expect(await screen.findByText("Test notification sent.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/notifications/test",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a failed test", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(json(settings));
    fetchMock.mockResolvedValueOnce(json(connections));

    render(<NotificationsSettingsPage />);
    await screen.findByDisplayValue("#alerts");

    fetchMock.mockResolvedValueOnce(json(settings));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Slack: invalid_auth" }),
    });

    await userEvent.click(screen.getByRole("button", { name: /send test/i }));

    expect(await screen.findByText("Slack: invalid_auth")).toBeInTheDocument();
  });
});
