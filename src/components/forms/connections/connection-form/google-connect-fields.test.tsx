import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoogleConnectFields } from "./google-connect-fields";

const user = userEvent.setup();

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GoogleConnectFields", () => {
  it("prefills the services stored on the connection", () => {
    render(
      <GoogleConnectFields
        connectionId="conn-1"
        connectionName="Work"
        connectedEmail="dev@example.com"
        initialServices="gmail drive"
      />,
    );

    expect(screen.getByRole("checkbox", { name: /^Gmail/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^Drive/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^Calendar/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /^Docs/ })).not.toBeChecked();
  });

  it("renders the consent action as a link, without Base UI warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<GoogleConnectFields connectionName="Work" initialServices="gmail" />);

    const link = screen.getByRole("link", { name: /Connect Google account/i });
    const url = new URL(link.getAttribute("href") ?? "", "http://localhost");

    expect(url.pathname).toBe("/api/oauth/google/start");
    expect(url.searchParams.get("services")).toBe("gmail");
    expect(url.searchParams.get("name")).toBe("Work");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("disables connecting until a service is selected", async () => {
    render(<GoogleConnectFields connectionName="Work" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: /Connect Google account/i })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /^Gmail/ }));

    expect(screen.getByRole("link", { name: /Connect Google account/i })).toBeInTheDocument();
  });

  it("shows Reconnect and Disconnect for an authorized account", () => {
    render(
      <GoogleConnectFields
        connectionId="conn-1"
        connectionName="Work"
        connectedEmail="dev@example.com"
        initialServices="gmail"
      />,
    );

    expect(screen.getByRole("link", { name: /Reconnect Google account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disconnect/i })).toBeInTheDocument();
    expect(screen.getByText(/Connected as/i)).toBeInTheDocument();
  });
});
