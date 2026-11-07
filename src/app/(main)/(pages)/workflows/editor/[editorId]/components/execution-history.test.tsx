import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecutionHistory } from "./execution-history";

const RUN = {
  id: "run-1",
  workflowId: "wf-1",
  status: "error",
  source: "webhook",
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  error: "HTTP 503 from provider",
  attempt: 1,
  retryOfRunId: null,
};

type Handler = (url: string, init?: RequestInit) => Promise<unknown>;

function stubFetch(handler: Handler) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function fail(status: number, body: unknown) {
  return { ok: false, status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function expandRun() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /HTTP 503/ }));
  return user;
}

describe("ExecutionHistory retries", () => {
  it("shows the attempt and retries a failed run", async () => {
    let runs: Array<Record<string, unknown>> = [RUN];
    const mock = stubFetch(async (url, init) => {
      if (init?.method === "POST") {
        runs = [...runs, { ...RUN, id: "run-2", attempt: 2, retryOfRunId: "run-1" }];
        return ok({ runId: "run-2", attempt: 2, success: true });
      }
      if (url.endsWith("/runs/run-1")) return ok({ logs: [] });
      return ok(runs);
    });

    render(<ExecutionHistory workflowId="wf-1" />);
    const user = await expandRun();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(mock).toHaveBeenCalledWith(
      "/api/workflows/wf-1/runs/run-1/retry",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("attempt 2")).toBeInTheDocument();
  });

  it("shows the throttled message when the server rejects the retry", async () => {
    stubFetch(async (url, init) => {
      if (init?.method === "POST") {
        return fail(409, { error: "retry cooldown active (12s left)" });
      }
      if (url.endsWith("/runs/run-1")) return ok({ logs: [] });
      return ok([RUN]);
    });

    render(<ExecutionHistory workflowId="wf-1" />);
    const user = await expandRun();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("retry cooldown active (12s left)")).toBeInTheDocument();
  });

  it("does not offer retry for sub-workflow runs", async () => {
    stubFetch(async (url) => {
      if (url.endsWith("/runs/run-1")) return ok({ logs: [] });
      return ok([{ ...RUN, source: "subWorkflow" }]);
    });

    render(<ExecutionHistory workflowId="wf-1" />);
    await expandRun();

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
