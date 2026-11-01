import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowCard } from "./workflow-card";
import type { Workflow } from "@/lib/types";

const mockWorkflow: Workflow = {
  id: "wf-123",
  name: "Deploy Automation",
  description: "Triggers on webhook and runs tasks",
  nodes: JSON.stringify([{ type: "Webhook", data: { title: "Webhook" } }]),
  edges: "[]",
  flowPath: null,
  type: "workflow",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("WorkflowCard", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workflow name, status, and trigger type badge", () => {
    render(<WorkflowCard workflow={mockWorkflow} onDelete={mockOnDelete} />);

    expect(screen.getByText("Deploy Automation")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Webhook")).toBeInTheDocument();
  });

  it("renders Paused badge when status is paused", () => {
    const pausedWorkflow: Workflow = { ...mockWorkflow, status: "paused" };
    render(<WorkflowCard workflow={pausedWorkflow} onDelete={mockOnDelete} />);

    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("calls onDelete with workflow id when delete button is clicked", async () => {
    render(<WorkflowCard workflow={mockWorkflow} onDelete={mockOnDelete} />);

    // The delete button is the second action button (Trash icon)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];

    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("wf-123");
  });
});

describe("WorkflowCard edit dialog", () => {
  const mockOnDelete = vi.fn();
  const mockOnUpdate = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openEditor() {
    render(<WorkflowCard workflow={mockWorkflow} onDelete={mockOnDelete} onUpdate={mockOnUpdate} />);
    await userEvent.click(screen.getByRole("button", { name: /edit deploy automation/i }));
    return screen.findByRole("dialog");
  }

  it("opens with the current name and description prefilled", async () => {
    await openEditor();

    expect(screen.getByLabelText("Name")).toHaveValue("Deploy Automation");
    expect(screen.getByLabelText("Description")).toHaveValue("Triggers on webhook and runs tasks");
  });

  it("saves the edited values and notifies the parent", async () => {
    const updated: Workflow = { ...mockWorkflow, name: "Renamed", description: "Updated copy" };
    fetchMock.mockResolvedValue({ ok: true, json: async () => updated });
    await openEditor();

    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");

    const descriptionInput = screen.getByLabelText("Description");
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "Updated copy");

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(fetchMock).toHaveBeenCalledWith("/api/workflows/wf-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed", description: "Updated copy" }),
    });
    await waitFor(() => expect(mockOnUpdate).toHaveBeenCalledWith(updated));
  });

  it("blocks saving when the name is empty", async () => {
    await openEditor();

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the API error and keeps the dialog open", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Record not found" }) });
    await openEditor();

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Record not found");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
