import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SendMessageSettings } from "./slack";
import type { Connection } from "@/lib/types";

const mockConnections: Connection[] = [
  { id: "conn-1", type: "Slack", name: "Slack Test", description: "", config: {}, createdAt: "", updatedAt: "" },
  { id: "conn-2", type: "Discord", name: "Discord Test", description: "", config: {}, createdAt: "", updatedAt: "" },
];

function Wrapper() {
  const [meta, setMeta] = useState<Record<string, string>>({});
  return (
    <SendMessageSettings
      meta={meta}
      handleChange={(key, value) => setMeta((prev) => ({ ...prev, [key]: value }))}
      updateMeta={(patch) => setMeta((prev) => ({ ...prev, ...patch }))}
      hasParentEdge={false}
    />
  );
}

describe("SendMessageSettings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockConnections), { status: 200 }),
      ),
    ) as unknown as typeof fetch;
  });

  it("renders channel and message inputs", async () => {
    render(<Wrapper />);

    expect(screen.getByText(/slack connection/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("#general or C1234567890")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Hello from devdock!")).toBeInTheDocument();
  });

  it("loads only Slack connections", async () => {
    render(<Wrapper />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /slack test/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("option", { name: /discord test/i })).not.toBeInTheDocument();
  });

  it("updates channel value when user types", async () => {
    render(<Wrapper />);

    await userEvent.type(screen.getByPlaceholderText("#general or C1234567890"), "#general");

    expect(screen.getByPlaceholderText("#general or C1234567890")).toHaveValue("#general");
  });
});
