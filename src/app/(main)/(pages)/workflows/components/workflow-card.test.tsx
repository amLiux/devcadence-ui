import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoveWorkflowForm, WorkflowCard } from "./workflow-card";
import type { Project, Workflow } from "@/lib/types";

const mockSetOpen = vi.fn();

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({
    setOpen: mockSetOpen,
    setClose: vi.fn(),
    isOpen: false,
    data: {},
  }),
}));

const projects: Project[] = [
  {
    id: "shared",
    name: "Shared",
    description: "",
    isShared: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "proj-dashboard",
    name: "devcadence-ui",
    description: "",
    isShared: false,
    createdAt: "",
    updatedAt: "",
  },
];

const mockWorkflow: Workflow = {
  id: "wf-123",
  name: "Deploy Automation",
  description: "Triggers on webhook and runs tasks",
  nodes: JSON.stringify([{ type: "Webhook", data: { title: "Webhook" } }]),
  edges: "[]",
  flowPath: null,
  type: "workflow",
  projectId: "shared",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("WorkflowCard", () => {
  const mockOnDelete = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnMove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderCard(workflow: Workflow = mockWorkflow) {
    render(
      <WorkflowCard
        workflow={workflow}
        projects={projects}
        projectName="Shared"
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        onMove={mockOnMove}
      />,
    );
  }

  it("renders workflow name, status, and trigger type badge", () => {
    renderCard();

    expect(screen.getByText("Deploy Automation")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Webhook")).toBeInTheDocument();
  });

  it("renders the project badge", () => {
    renderCard();

    expect(screen.getByText("Shared")).toBeInTheDocument();
  });

  it("opens the move drawer", async () => {
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: /move deploy automation/i }));

    expect(mockSetOpen).toHaveBeenCalledTimes(1);
    expect(React.isValidElement(mockSetOpen.mock.calls[0][0])).toBe(true);
  });

  it("moves the workflow to the selected project", async () => {
    const onMove = vi.fn().mockResolvedValue(undefined);
    render(<MoveWorkflowForm workflow={mockWorkflow} projects={projects} onMove={onMove} />);

    await userEvent.selectOptions(screen.getByLabelText("Project"), "proj-dashboard");
    await userEvent.click(screen.getByRole("button", { name: /^move$/i }));

    expect(onMove).toHaveBeenCalledWith("wf-123", "proj-dashboard");
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
