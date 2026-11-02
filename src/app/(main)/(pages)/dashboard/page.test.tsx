import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

function emptyStats(range = "7d") {
  return {
    range,
    window: {
      from: "2026-10-26T12:00:00.000Z",
      to: "2026-11-02T12:00:00.000Z",
      previousFrom: "2026-10-19T12:00:00.000Z",
      previousTo: "2026-10-26T12:00:00.000Z",
    },
    kpis: {
      runs: { value: 0, previous: 0, deltaPct: null },
      successRate: { value: null, previous: null, deltaPp: null },
      p95DurationMs: { value: null, previous: null, deltaPct: null },
      aiTokens: { value: 0, previous: 0, deltaPct: null },
      running: 0,
    },
    volume: [{ bucket: "2026-11-01T00:00:00.000Z", success: 0, error: 0 }],
    sources: [],
    failingNodes: [],
    workflows: [],
  };
}

function mockFetch(response: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty state when there are no runs", async () => {
    mockFetch(emptyStats());

    render(<DashboardPage />);

    expect(await screen.findByText(/no runs in the last 7 days/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to workflows/i })).toBeInTheDocument();
  });

  it("requests the selected range", async () => {
    const fetchMock = mockFetch(emptyStats());

    render(<DashboardPage />);
    await screen.findByText(/no runs in the last 7 days/i);

    await userEvent.click(screen.getByRole("button", { name: "30d" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard?range=30d",
        expect.anything(),
      );
    });
  });

  it("surfaces a loading error and retries", async () => {
    const fetchMock = mockFetch(emptyStats());
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<DashboardPage />);

    expect(await screen.findByText(/could not load the dashboard/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText(/no runs in the last 7 days/i)).toBeInTheDocument();
  });
});
