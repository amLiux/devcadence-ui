import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorCanvasSidebar } from "./editor-canvas-sidebar";
import type { EditorNode, EditorEdge, WorkflowContext } from "@/lib/types";

const mockConnections = [
  { id: "conn-slack", type: "Slack", name: "Slack", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-discord", type: "Discord", name: "Discord", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-github", type: "GitHub", name: "GitHub", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-postgres", type: "PostgreSQL", name: "PostgreSQL", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-ai", type: "AI", name: "AI", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-webhook", type: "Webhook", name: "Webhook", description: "", config: {}, createdAt: "", updatedAt: "" },
];

const emptyEditorState = {
  elements: [] as EditorNode[],
  edges: [] as EditorEdge[],
  selectedNode: null,
  context: {} as WorkflowContext,
};

const mockEditorContext = {
  editor: emptyEditorState,
  history: { history: [emptyEditorState], currentIndex: 0 },
  dispatch: vi.fn(),
  addNode: vi.fn(),
  deleteNode: vi.fn(),
  updateNode: vi.fn(),
  setEdges: vi.fn(),
  selectNode: vi.fn(),
  sidebarTab: "actions" as const,
  setSidebarTab: vi.fn(),
  setContext: vi.fn(),
  dirty: false,
  markDirty: vi.fn(),
  setDirty: vi.fn(),
};

vi.mock("@/providers/editor-provider", () => ({
  useEditor: () => mockEditorContext,
  EditorProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

function renderSidebar() {
  return render(<EditorCanvasSidebar workflowId="wf-1" />);
}

describe("EditorCanvasSidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEditorContext.sidebarTab = "actions";
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(mockConnections), { status: 200 })),
    ) as unknown as typeof fetch;
  });

  it("renders category headers", async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/communication/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/repository/i)).toBeInTheDocument();
    expect(screen.getByText(/data/i)).toBeInTheDocument();
    expect(screen.getByText(/ai/i)).toBeInTheDocument();
    expect(screen.getByText(/core/i)).toBeInTheDocument();
    expect(screen.getByText(/security/i)).toBeInTheDocument();
  });

  it("shows trigger nodes when canvas is empty", async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/webhook/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
  });

  it("hides trigger nodes when canvas has nodes", async () => {
    mockEditorContext.editor.elements = [
      {
        id: "node-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        data: { type: "Trigger", title: "Webhook", description: "", completed: false, current: false, metadata: {} },
      },
    ];
    renderSidebar();
    await waitFor(() => {
      expect(screen.queryByText(/triggers/i)).not.toBeInTheDocument();
    });
    mockEditorContext.editor.elements = [];
  });

  it("filters nodes by configured connection types", async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/send slack message/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/send discord message/i)).toBeInTheDocument();
    expect(screen.queryByText(/send email/i)).not.toBeInTheDocument();
  });

  it("expands a category when clicked", async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/communication/i)).toBeInTheDocument();
    });

    const communicationHeader = screen.getByRole("button", { name: /communication/i });
    await userEvent.click(communicationHeader);

    // Communication starts expanded, so clicking collapses it
    expect(screen.queryByRole("button", { name: /send slack message/i })).not.toBeInTheDocument();

    // Click again to expand
    await userEvent.click(communicationHeader);
    expect(screen.getByText(/send slack message/i)).toBeInTheDocument();
  });

  it("limits expanded categories to 2 at a time", async () => {
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/communication/i)).toBeInTheDocument();
    });

    // Communication starts expanded. Expand Repository and Data.
    await userEvent.click(screen.getByRole("button", { name: /repository/i }));
    await userEvent.click(screen.getByRole("button", { name: /data/i }));

    // Communication should have auto-collapsed because max 2 expanded
    await waitFor(() => {
      expect(screen.queryByText(/send slack message/i)).not.toBeInTheDocument();
    });

    // Repository and Data should still be expanded
    expect(screen.getByText(/create issue/i)).toBeInTheDocument();
    expect(screen.getByText(/postgresql query/i)).toBeInTheDocument();
  });

  it("sets drag data on draggable cards", async () => {
    const setData = vi.fn();
    const dataTransfer = { setData, effectAllowed: "" } as unknown as DataTransfer;

    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText(/send slack message/i)).toBeInTheDocument();
    });

    const card = screen.getByText(/send slack message/i).closest("[draggable='true']") as HTMLElement;
    const dragEvent = new MouseEvent("dragstart", { bubbles: true }) as unknown as React.DragEvent;
    Object.defineProperty(dragEvent, "dataTransfer", { value: dataTransfer });

    card.dispatchEvent(dragEvent as unknown as Event);

    expect(setData).toHaveBeenCalledWith("application/reactflow-type", "Slack");
    expect(setData).toHaveBeenCalledWith("application/reactflow-title", "Send Slack Message");
  });
});
