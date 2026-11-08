import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EditorPage from "./page";
import type { Workflow } from "@/lib/types";

const { requestMock, pushMock, routerMock, paramsMock } = vi.hoisted(() => {
  const push = vi.fn();
  return {
    requestMock: vi.fn(),
    pushMock: push,
    routerMock: { push },
    paramsMock: { editorId: "wf-1" },
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => routerMock,
}));

vi.mock("@/hooks/use-api", () => ({
  useApi: () => ({ request: requestMock, loading: false, error: null }),
}));

vi.mock("@/providers/editor-provider", () => ({
  EditorProvider: ({
    children,
    projectId,
  }: {
    children: React.ReactNode;
    projectId?: string;
  }) => (
    <div data-testid="editor-provider" data-project-id={projectId}>
      {children}
    </div>
  ),
}));

vi.mock("./components/editor-shell", () => ({
  EditorShell: ({ projectName }: { projectName?: string }) => (
    <div data-testid="editor-shell" data-project-name={projectName} />
  ),
}));

const workflow: Workflow = {
  id: "wf-1",
  name: "Deploy alerts",
  description: "",
  type: "workflow",
  projectId: "proj-dashboard",
  projectName: "devcadence-ui",
  nodes: "[]",
  edges: "[]",
  flowPath: null,
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  requestMock.mockReset();
  pushMock.mockReset();
  requestMock.mockResolvedValue(workflow);
});

describe("EditorPage", () => {
  it("loads the workflow once and does not fetch the projects list", async () => {
    render(<EditorPage />);

    await waitFor(() => {
      expect(screen.getByTestId("editor-shell")).toBeInTheDocument();
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith({ endpoint: "/api/workflows/wf-1" });
    expect(requestMock).not.toHaveBeenCalledWith({ endpoint: "/api/projects" });
  });

  it("passes the project from the workflow to the editor", async () => {
    render(<EditorPage />);

    const provider = await screen.findByTestId("editor-provider");
    expect(provider).toHaveAttribute("data-project-id", "proj-dashboard");
    expect(screen.getByTestId("editor-shell")).toHaveAttribute(
      "data-project-name",
      "devcadence-ui",
    );
  });
});
