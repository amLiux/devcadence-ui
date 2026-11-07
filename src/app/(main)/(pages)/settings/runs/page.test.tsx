import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RunsSettingsPage from "./page";

const policy = {
  enabled: true,
  maxAttempts: 3,
  baseDelayMs: 2_000,
  manualCooldownMs: 30_000,
  maxChain: 10,
};

function json(body: unknown) {
  return { ok: true, json: async () => body };
}

function mockFetch() {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") return json(JSON.parse(init.body as string));
    return json(policy);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RunsSettingsPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the stored policy", async () => {
    mockFetch();

    render(<RunsSettingsPage />);

    expect(screen.getByRole("heading", { name: "Runs & retries" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("links back to the settings hub", () => {
    mockFetch();

    render(<RunsSettingsPage />);

    expect(screen.getByRole("link", { name: /back to settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("saves the edited policy in milliseconds", async () => {
    const fetchMock = mockFetch();
    const user = userEvent.setup();

    render(<RunsSettingsPage />);
    await screen.findByDisplayValue("3");

    fireEvent.change(screen.getByLabelText("Max attempts"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Base delay (seconds)"), {
      target: { value: "4" },
    });

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/runs",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ ...policy, maxAttempts: 5, baseDelayMs: 4_000 }),
      }),
    );
  });

  it("surfaces a save error", async () => {
    const fetchMock = mockFetch();
    const user = userEvent.setup();

    render(<RunsSettingsPage />);
    await screen.findByDisplayValue("3");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Max attempts must be between 1 and 10" }),
    });

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText("Max attempts must be between 1 and 10"),
    ).toBeInTheDocument();
  });
});
