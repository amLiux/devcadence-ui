import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { formatRelativeTime, VersionHistoryPanel } from "./version-history";

const NOW = Date.now();

const CURRENT_NODES = JSON.stringify([
  { id: "a", data: { title: "Webhook", type: "Trigger", metadata: {} } },
  {
    id: "b",
    data: { title: "Send Slack Message", type: "Slack", metadata: { channel: "#new" } },
  },
  { id: "c", data: { title: "Conditional", type: "Action", metadata: { expression: "x > 1" } } },
]);

const CURRENT_EDGES = JSON.stringify([
  { id: "e1", source: "a", target: "b" },
  { id: "e2", source: "b", target: "c" },
]);

const OLD_NODES = JSON.stringify([
  { id: "a", data: { title: "Webhook", type: "Trigger", metadata: {} } },
  {
    id: "b",
    data: { title: "Send Slack Message", type: "Slack", metadata: { channel: "#old" } },
  },
]);

const OLD_EDGES = JSON.stringify([{ id: "e1", source: "a", target: "b" }]);

function version(overrides: Record<string, unknown> = {}) {
  return {
    id: "ver-1",
    version: 1,
    name: "Deploy alerts",
    description: "",
    type: "workflow",
    status: "draft",
    source: "save",
    createdAt: new Date(NOW - 5 * 60_000).toISOString(),
    nodeCount: 2,
    edgeCount: 1,
    ...overrides,
  };
}

function versionDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "ver-1",
    workflowId: "wf-1",
    version: 1,
    nodes: OLD_NODES,
    edges: OLD_EDGES,
    ...overrides,
  };
}

function mockFetch(response: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPanel(props: Partial<ComponentProps<typeof VersionHistoryPanel>> = {}) {
  const onRestored = vi.fn();
  render(
    <VersionHistoryPanel
      workflowId="wf-1"
      currentNodes={CURRENT_NODES}
      currentEdges={CURRENT_EDGES}
      onRestored={onRestored}
      {...props}
    />,
  );
  return { onRestored };
}

describe("formatRelativeTime", () => {
  it("describes recent timestamps", () => {
    expect(formatRelativeTime(new Date(NOW - 20_000).toISOString(), NOW)).toBe("just now");
    expect(formatRelativeTime(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe("5 min ago");
    expect(formatRelativeTime(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe("3 h ago");
    expect(formatRelativeTime(new Date(NOW - 2 * 86_400_000).toISOString(), NOW)).toBe("2 d ago");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("");
  });
});

describe("VersionHistoryPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the current canvas next to the stored versions", async () => {
    mockFetch({ versions: [version()], page: 1, pageSize: 10, total: 1, hasMore: false });

    renderPanel();

    expect(await screen.findByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("3 nodes · 2 edges")).toBeInTheDocument();
    expect(screen.getByText("2 nodes · 1 edges")).toBeInTheDocument();
    expect(screen.getByText("5 min ago")).toBeInTheDocument();
  });

  it("explains the empty state", async () => {
    mockFetch({ versions: [], page: 1, pageSize: 10, total: 0, hasMore: false });

    renderPanel();

    expect(await screen.findByText(/no versions yet/i)).toBeInTheDocument();
  });

  it("loads the next page on demand", async () => {
    const fetchMock = mockFetch({
      versions: [version({ id: "ver-2", version: 2 })],
      page: 1,
      pageSize: 10,
      total: 12,
      hasMore: true,
    });

    renderPanel();
    await screen.findByText("v2");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        versions: [version({ id: "ver-1", version: 1 })],
        page: 2,
        pageSize: 10,
        total: 12,
        hasMore: false,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("v1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/workflows/wf-1/versions?page=2&pageSize=10",
      expect.anything(),
    );
  });

  it("asks for confirmation before restoring", async () => {
    mockFetch({ versions: [version()], page: 1, pageSize: 10, total: 1, hasMore: false });

    renderPanel();
    const row = await screen.findByTestId("version-1");

    await userEvent.click(within(row).getByRole("button", { name: /restore/i }));

    expect(within(row).getByText(/the current state is saved first/i)).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("restores the selected version and notifies the caller", async () => {
    const fetchMock = mockFetch({
      versions: [version()],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    const { onRestored } = renderPanel();
    const row = await screen.findByTestId("version-1");

    await userEvent.click(within(row).getByRole("button", { name: /restore/i }));
    await userEvent.click(within(row).getByRole("button", { name: /^restore$/i }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/workflows/wf-1/versions/ver-1/restore",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onRestored).toHaveBeenCalled();
  });

  it("surfaces a failed restore", async () => {
    const fetchMock = mockFetch({
      versions: [version()],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    renderPanel();
    const row = await screen.findByTestId("version-1");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to restore version" }),
    });

    await userEvent.click(within(row).getByRole("button", { name: /restore/i }));
    await userEvent.click(within(row).getByRole("button", { name: /^restore$/i }));

    expect(await screen.findByText(/could not restore this version/i)).toBeInTheDocument();
  });

  it("compares a version with the current canvas", async () => {
    const fetchMock = mockFetch({
      versions: [version()],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    renderPanel();
    const row = await screen.findByTestId("version-1");

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => versionDetail() });
    await userEvent.click(within(row).getByRole("button", { name: /compare/i }));

    expect(await screen.findByText("v1 → Current")).toBeInTheDocument();
    expect(screen.getByText("+1 nodes")).toBeInTheDocument();
    expect(screen.getByText("~1 nodes")).toBeInTheDocument();
    expect(screen.getByText("+1 edges")).toBeInTheDocument();

    const before = screen.getByTestId("diff-before");
    const after = screen.getByTestId("diff-after");
    expect(within(before).getByText(/nothing removed/i)).toBeInTheDocument();
    expect(within(after).getByText(/\+ Conditional/)).toBeInTheDocument();

    const changed = screen.getByTestId("changed-b");
    expect(within(changed).getByText("channel")).toBeInTheDocument();
    expect(within(changed).getByText("#old")).toBeInTheDocument();
    expect(within(changed).getByText("#new")).toBeInTheDocument();
  });

  it("returns to the list from the diff view", async () => {
    const fetchMock = mockFetch({
      versions: [version()],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    renderPanel();
    const row = await screen.findByTestId("version-1");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => versionDetail() });

    await userEvent.click(within(row).getByRole("button", { name: /compare/i }));
    await screen.findByText("v1 → Current");

    await userEvent.click(screen.getByRole("button", { name: /all versions/i }));

    expect(screen.getByTestId("version-1")).toBeInTheDocument();
  });

  it("says so when the version matches the current canvas", async () => {
    const fetchMock = mockFetch({
      versions: [version({ nodeCount: 3, edgeCount: 2 })],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    renderPanel();
    const row = await screen.findByTestId("version-1");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => versionDetail({ nodes: CURRENT_NODES, edges: CURRENT_EDGES }),
    });

    await userEvent.click(within(row).getByRole("button", { name: /compare/i }));

    expect(await screen.findByText(/no differences between v1/i)).toBeInTheDocument();
  });

  it("surfaces a failed compare", async () => {
    const fetchMock = mockFetch({
      versions: [version()],
      page: 1,
      pageSize: 10,
      total: 1,
      hasMore: false,
    });

    renderPanel();
    const row = await screen.findByTestId("version-1");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to fetch version" }),
    });

    await userEvent.click(within(row).getByRole("button", { name: /compare/i }));

    expect(await screen.findByText(/could not load this version/i)).toBeInTheDocument();
  });
});
