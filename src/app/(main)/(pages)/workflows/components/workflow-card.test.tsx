import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowCard } from "./workflow-card";
import type { Workflow } from "@/lib/types";

const mockSetOpen = vi.fn();

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({
    setOpen: mockSetOpen,
    setClose: vi.fn(),
    isOpen: false,
    data: {},
  }),
}));

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
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderCard(workflow: Workflow = mockWorkflow) {
    render(<WorkflowCard workflow={workflow} onDelete={mockOnDelete} onUpdate={mockOnUpdate} />);
  }

  it("renders workflow name, status, and trigger type badge", () => {
    renderCard();

    expect(screen.getByText("Deploy Automation")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Webhook")).toBeInTheDocument();
  });

  it("renders Paused badge when status is paused", () => {
    renderCard({ ...mockWorkflow, status: "paused" });

    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("calls onDelete with workflow id when delete button is clicked", async () => {
    renderCard();

    // The delete button is the last action button (Trash icon)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons[buttons.length - 1];

    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith("wf-123");
  });

  it("opens the edit drawer through the modal provider", async () => {
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: /edit deploy automation/i }));

    expect(mockSetOpen).toHaveBeenCalledTimes(1);
    expect(React.isValidElement(mockSetOpen.mock.calls[0][0])).toBe(true);
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});
