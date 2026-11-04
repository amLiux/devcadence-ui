import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Workflows } from "./index";
import type { Project, Workflow } from "@/lib/types";

const requestMock = vi.fn();
const setOpenMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => ({ request: requestMock, loading: false, error: null }),
}));

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({
    setOpen: setOpenMock,
    setClose: vi.fn(),
    isOpen: false,
    data: {},
  }),
}));

const shared: Project = {
  id: "shared",
  name: "Shared",
  description: "",
  isShared: true,
  createdAt: "",
  updatedAt: "",
};

const dashboard: Project = {
  id: "proj-dashboard",
  name: "devcadence-ui",
  description: "",
  isShared: false,
  createdAt: "",
  updatedAt: "",
};

function workflow(id: string, name: string, projectId: string): Workflow {
  return {
    id,
    name,
    description: "",
    nodes: "[]",
    edges: "[]",
    flowPath: null,
    type: "workflow",
    projectId,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const workflows = [
  workflow("wf-1", "Shared job", "shared"),
  workflow("wf-2", "Dashboard job", "proj-dashboard"),
];

beforeEach(() => {
  vi.clearAllMocks();
  requestMock.mockImplementation(async ({ endpoint }: { endpoint: string }) => {
    if (endpoint === "/api/workflows") return { workflows };
    if (endpoint === "/api/projects") return { projects: [shared, dashboard] };
    return null;
  });
});

describe("Workflows", () => {
  it("shows the project rail with counts and filters the cards", async () => {
    render(<Workflows />);

    expect(await screen.findByText("Shared job")).toBeInTheDocument();
    expect(screen.getByText("Dashboard job")).toBeInTheDocument();

    const all = screen.getByRole("button", { name: /all workflows/i });
    expect(all).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /devcadence-ui/i })).toHaveTextContent("1");

    await userEvent.click(screen.getByRole("button", { name: /devcadence-ui/i }));

    expect(screen.queryByText("Shared job")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard job")).toBeInTheDocument();
  });

  it("opens the new project drawer", async () => {
    render(<Workflows />);
    await screen.findByText("Shared job");

    await userEvent.click(screen.getByRole("button", { name: /new project/i }));

    expect(setOpenMock).toHaveBeenCalledTimes(1);
  });
});
