import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
