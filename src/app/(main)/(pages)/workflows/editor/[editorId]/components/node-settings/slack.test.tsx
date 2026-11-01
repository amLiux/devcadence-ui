import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SendMessageSettings } from "./slack";

const mockConnections = [
  { id: "conn-slack-1", type: "Slack", name: "Engineering Slack" },
  { id: "conn-discord-1", type: "Discord", name: "Discord Server" },
];

const mockRequest = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => ({
    request: mockRequest,
    loading: false,
    error: null,
  }),
}));

describe("SendMessageSettings (Slack)", () => {
  const mockHandleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest.mockResolvedValue(mockConnections);
  });

  it("renders connection select and inputs for channel and message", async () => {
    render(
      <SendMessageSettings
        meta={{ channel: "#general", text: "Deployment complete" }}
        handleChange={mockHandleChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Engineering Slack" })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("#general")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Deployment complete")).toBeInTheDocument();
  });

  it("calls handleChange when channel or message input changes", async () => {
    render(
      <SendMessageSettings
        meta={{ channel: "", text: "" }}
        handleChange={mockHandleChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Engineering Slack" })).toBeInTheDocument();
    });

    const channelInput = screen.getByPlaceholderText("#general or C1234567890");
    await userEvent.type(channelInput, "#alerts");

    expect(mockHandleChange).toHaveBeenCalledWith("channel", expect.any(String));

    const messageInput = screen.getByPlaceholderText("Hello from devdock!");
    await userEvent.type(messageInput, "Ping");

    expect(mockHandleChange).toHaveBeenCalledWith("text", expect.any(String));
  });
});
