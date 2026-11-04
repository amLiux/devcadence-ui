import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProjectAndReassign: vi.fn(),
}));

vi.mock("@/lib/db/projects", () => ({
  getProject: mocks.getProject,
  updateProject: mocks.updateProject,
  deleteProjectAndReassign: mocks.deleteProjectAndReassign,
}));

const project = {
  id: "proj-1",
  name: "devcadence-ui",
  description: "",
  isShared: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function put(body: unknown, id = "proj-1") {
  return PUT(
    new Request(`http://localhost/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function del(id = "proj-1") {
  return DELETE(new Request(`http://localhost/api/projects/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  mocks.getProject.mockReset();
  mocks.updateProject.mockReset();
  mocks.deleteProjectAndReassign.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getProject.mockResolvedValue(project);
  mocks.updateProject.mockResolvedValue({ ...project, name: "renamed" });
  mocks.deleteProjectAndReassign.mockResolvedValue(project);
});

describe("PUT /api/projects/[id]", () => {
  it("returns 404 for an unknown project", async () => {
    mocks.getProject.mockResolvedValue(null);

    const response = await put({ name: "renamed" });

    expect(response.status).toBe(404);
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it("rejects a blank name", async () => {
    const response = await put({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("renames the project", async () => {
    const response = await put({ name: "  renamed  " });

    expect(response.status).toBe(200);
    expect(mocks.updateProject).toHaveBeenCalledWith("proj-1", { name: "renamed" });
  });

  it("returns 500 when the update fails", async () => {
    mocks.updateProject.mockRejectedValue(new Error("db down"));

    const response = await put({ name: "renamed" });

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/projects/[id]", () => {
  it("returns 404 for an unknown project", async () => {
    mocks.getProject.mockResolvedValue(null);

    const response = await del();

    expect(response.status).toBe(404);
  });

  it("refuses to delete the shared project", async () => {
    mocks.getProject.mockResolvedValue({ ...project, isShared: true });

    const response = await del();

    expect(response.status).toBe(400);
    expect(mocks.deleteProjectAndReassign).not.toHaveBeenCalled();
  });

  it("moves the workflows to shared and deletes the project", async () => {
    const response = await del();

    expect(response.status).toBe(200);
    expect(mocks.deleteProjectAndReassign).toHaveBeenCalledWith("proj-1");
  });

  it("returns 500 when the delete fails", async () => {
    mocks.deleteProjectAndReassign.mockRejectedValue(new Error("db down"));

    const response = await del();

    expect(response.status).toBe(500);
  });
});
