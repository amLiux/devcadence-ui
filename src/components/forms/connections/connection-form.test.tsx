import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionForm } from "./connection-form";
import type { Connection } from "@/lib/types";

const setCloseMock = vi.fn();

vi.mock("@/providers/modal-provider", () => ({
  useModal: () => ({ setClose: setCloseMock, setOpen: vi.fn(), isOpen: false, data: {} }),
}));

const user = userEvent.setup();

function openAiForm() {
  const aiButton = screen
    .getAllByRole("button")
    .find((button) => button.textContent?.trim() === "AI");

  if (!aiButton) throw new Error("AI connection type not found");
  return user.click(aiButton);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConnectionForm AI defaults", () => {
  it("creates a DeepSeek connection by default", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionForm onSubmit={onSubmit} />);

    await openAiForm();
    await user.type(screen.getByLabelText("Name"), "DeepSeek");
    await user.type(screen.getByLabelText("API Key"), "sk-test");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AI",
        config: expect.objectContaining({
          provider: "deepseek",
          apiKey: "sk-test",
          baseUrl: "",
        }),
      }),
    );
  });

  it("requires an API key for hosted providers", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionForm onSubmit={onSubmit} />);

    await openAiForm();
    await user.type(screen.getByLabelText("Name"), "DeepSeek");
    await user.type(screen.getByLabelText("Base URL"), "https://api.deepseek.com");

    const connectButton = screen.getByRole("button", { name: "Connect" });
    expect(connectButton).toBeDisabled();

    await user.type(screen.getByLabelText("API Key"), "sk-test");
    expect(connectButton).not.toBeDisabled();
  });

  it("requires Base URL for a custom endpoint", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionForm onSubmit={onSubmit} />);

    await openAiForm();
    await user.selectOptions(screen.getByLabelText("Provider"), "custom");
    await user.type(screen.getByLabelText("Name"), "Ollama");

    const connectButton = screen.getByRole("button", { name: "Connect" });
    expect(connectButton).toBeDisabled();

    await user.type(screen.getByLabelText("Base URL"), "http://localhost:11434/v1");
    expect(connectButton).not.toBeDisabled();
  });

  it("allows a custom endpoint without a key when the URL is set", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ConnectionForm onSubmit={onSubmit} />);

    await openAiForm();
    await user.selectOptions(screen.getByLabelText("Provider"), "custom");
    await user.type(screen.getByLabelText("Name"), "Ollama");
    await user.type(screen.getByLabelText("Base URL"), "http://localhost:11434/v1");

    const connectButton = screen.getByRole("button", { name: "Connect" });
    expect(connectButton).not.toBeDisabled();

    await user.click(connectButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          provider: "custom",
          baseUrl: "http://localhost:11434/v1",
          apiKey: "",
        }),
      }),
    );
  });

  it("allows switching an existing connection to a custom endpoint without a key", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const initialData: Connection = {
      id: "conn-1",
      type: "AI",
      name: "Hosted",
      description: "",
      config: {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        apiKey: "sk-stored",
        model: "deepseek-flash",
      },
      createdAt: "",
      updatedAt: "",
    };

    render(<ConnectionForm initialData={initialData} onSubmit={vi.fn()} onUpdate={onUpdate} />);

    await user.selectOptions(screen.getByLabelText("Provider"), "custom");
    await user.clear(screen.getByLabelText("Base URL"));
    await user.type(screen.getByLabelText("Base URL"), "http://localhost:11434/v1");
    await user.clear(screen.getByLabelText("API Key"));

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(onUpdate).toHaveBeenCalledWith(
      "conn-1",
      expect.objectContaining({
        config: expect.objectContaining({
          provider: "custom",
          baseUrl: "http://localhost:11434/v1",
          apiKey: "",
        }),
      }),
    );
  });

  it("does not render a stored key and keeps it when saving", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const initialData: Connection = {
      id: "conn-1",
      type: "AI",
      name: "Local model",
      description: "",
      config: {
        provider: "custom",
        baseUrl: "http://localhost:11434/v1",
        apiKey: "sk-stored",
        model: "llama3.1",
      },
      createdAt: "",
      updatedAt: "",
    };

    render(<ConnectionForm initialData={initialData} onSubmit={vi.fn()} onUpdate={onUpdate} />);

    const keyInput = screen.getByLabelText("API Key") as HTMLInputElement;
    expect(keyInput.value).toBe("");
    expect(keyInput.placeholder).toBe("Saved — leave blank to keep");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onUpdate).toHaveBeenCalledWith(
      "conn-1",
      expect.objectContaining({
        config: expect.objectContaining({ apiKey: "sk-stored" }),
      }),
    );
  });
});
