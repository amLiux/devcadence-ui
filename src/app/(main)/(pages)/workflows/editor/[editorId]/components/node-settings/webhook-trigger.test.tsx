import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WebhookSettings } from "./webhook-trigger";

const mockConnections = [
  { id: "conn-webhook-1", type: "Webhook", name: "Primary Webhook" },
  { id: "conn-github-1", type: "GitHub", name: "GitHub Repo" },
];

const mockRequest = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => ({
    request: mockRequest,
    loading: false,
    error: null,
  }),
}));

describe("WebhookSettings", () => {
  const mockHandleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue(mockConnections);
  });

  it("loads and displays webhook connections in the dropdown", async () => {
    render(<WebhookSettings meta={{}} handleChange={mockHandleChange} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    expect(screen.getByRole("option", { name: "Primary Webhook" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "GitHub Repo" })).not.toBeInTheDocument();
  });

  it("calls handleChange when connection is selected", async () => {
    render(<WebhookSettings meta={{}} handleChange={mockHandleChange} />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Primary Webhook" })).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "conn-webhook-1");

    expect(mockHandleChange).toHaveBeenCalledWith("connectionId", "conn-webhook-1");
  });

  it("displays webhook URL when connectionId is set", () => {
    render(
      <WebhookSettings
        meta={{ connectionId: "conn-webhook-1" }}
        handleChange={mockHandleChange}
      />
    );

    expect(screen.getByText(/\/api\/webhooks\/conn-webhook-1/)).toBeInTheDocument();
  });

  it("infers schema from valid test payload when Infer Schema is clicked", async () => {
    render(
      <WebhookSettings
        meta={{
          connectionId: "conn-webhook-1",
          testPayload: JSON.stringify({ userId: 123, status: "active" }),
        }}
        handleChange={mockHandleChange}
      />
    );

    const inferButton = screen.getByRole("button", { name: /infer/i });
    await userEvent.click(inferButton);

    expect(mockHandleChange).toHaveBeenCalledWith(
      "schemaJson",
      expect.stringContaining('"type": "object"')
    );
  });
});
