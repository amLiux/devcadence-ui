import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowForm } from "./workflow-form";
import type { Project, Workflow } from "@/lib/types";

const requestMock = vi.fn();
const setCloseMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => ({ request: requestMock, loading: false, error: null }),
}));

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({ setClose: setCloseMock, setOpen: vi.fn(), isOpen: false, data: {} }),
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

const workflow: Workflow = {
  id: "wf-123",
  name: "Deploy Automation",
  description: "Triggers on webhook",
  nodes: "[]",
  edges: "[]",
  flowPath: null,
  type: "workflow",
  projectId: "shared",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkflowForm in create mode", () => {
  it("renders the reusable switch and the create button", () => {
    render(<WorkflowForm />);

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create workflow/i })).toBeInTheDocument();
  });

  it("defaults the project to Shared and submits the chosen one", async () => {
    requestMock.mockResolvedValue({ ...workflow, id: "wf-new" });
    render(<WorkflowForm projects={projects} defaultProjectId="shared" />);

    expect(screen.getByLabelText("Project")).toHaveValue("shared");

    await userEvent.selectOptions(screen.getByLabelText("Project"), "proj-dashboard");
    await userEvent.type(screen.getByLabelText("Name"), "New Flow");
    await userEvent.click(screen.getByRole("button", { name: /create workflow/i }));

    expect(requestMock).toHaveBeenCalledWith({
      endpoint: "/api/workflows",
      method: "POST",
      data: {
        name: "New Flow",
        description: "",
        type: "workflow",
        projectId: "proj-dashboard",
      },
    });
  });

  it("posts a new workflow and navigates to its editor", async () => {
    requestMock.mockResolvedValue({ ...workflow, id: "wf-new" });
    render(<WorkflowForm />);

    await userEvent.type(screen.getByLabelText("Name"), "  New Flow  ");
    await userEvent.click(screen.getByRole("button", { name: /create workflow/i }));

    expect(requestMock).toHaveBeenCalledWith({
      endpoint: "/api/workflows",
      method: "POST",
      data: { name: "New Flow", description: "", type: "workflow" },
    });
    expect(setCloseMock).toHaveBeenCalled();
  });
});

describe("WorkflowForm in edit mode", () => {
  it("prefills the current values and hides the reusable switch", () => {
    render(<WorkflowForm initialData={workflow} onUpdate={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Deploy Automation");
    expect(screen.getByLabelText("Description")).toHaveValue("Triggers on webhook");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("submits trimmed values through onUpdate", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<WorkflowForm initialData={workflow} onUpdate={onUpdate} />);

    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "  Renamed  ");

    const descriptionInput = screen.getByLabelText("Description");
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "  Updated copy  ");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onUpdate).toHaveBeenCalledWith("wf-123", {
      name: "Renamed",
      description: "Updated copy",
    });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("blocks saving when the name is empty", async () => {
    const onUpdate = vi.fn();
    render(<WorkflowForm initialData={workflow} onUpdate={onUpdate} />);

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("shows the API error when the update fails", async () => {
    const onUpdate = vi.fn().mockRejectedValue(new Error("Record not found"));
    render(<WorkflowForm initialData={workflow} onUpdate={onUpdate} />);

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Record not found");
    expect(setCloseMock).not.toHaveBeenCalled();
  });
});
