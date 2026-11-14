import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, listEvents } from "@/lib/google-calendar";
import { uploadFile } from "@/lib/google-drive/client";
import { createDocument } from "@/lib/google-docs/client";
import { handleCreateCalendarEvent, handleListCalendarEvents, handleWatchCalendarEvents } from "./google-calendar";
import { handleUploadFile } from "./google-drive";
import { handleCreateDocument, handleAppendText } from "./google-docs";

vi.mock("@/lib/google-calendar", () => ({
  createEvent: vi.fn(),
  listEvents: vi.fn(),
}));

vi.mock("@/lib/google-drive/client", () => ({ uploadFile: vi.fn(), listFiles: vi.fn() }));

vi.mock("@/lib/google-docs/client", () => ({
  createDocument: vi.fn(),
  appendText: vi.fn(),
  getDocument: vi.fn(),
}));

const createEventMock = vi.mocked(createEvent);
const listEventsMock = vi.mocked(listEvents);
const uploadMock = vi.mocked(uploadFile);
const createDocMock = vi.mocked(createDocument);

const chain = {
  name: "Trigger",
  output: { name: "Ana", date: "2026-11-20" },
  success: true,
  error: null,
} as never;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calendar handlers", () => {
  it("requires summary, start and end", async () => {
    await expect(handleCreateCalendarEvent({ start: "x", end: "y" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Event summary is required",
    });
    await expect(handleCreateCalendarEvent({ summary: "Sync" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Start and end are required (ISO date-time)",
    });
  });

  it("resolves templates and splits attendees", async () => {
    createEventMock.mockResolvedValue({ id: "e1", summary: "Sync", htmlLink: "url" } as never);

    await handleCreateCalendarEvent(
      {
        summary: "Sync with {{previousStep.name}}",
        start: "2026-11-20T10:00:00-06:00",
        end: "2026-11-20T10:30:00-06:00",
        attendees: "a@b.com, c@d.com",
      },
      chain,
    );

    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Sync with Ana",
        attendees: ["a@b.com", "c@d.com"],
      }),
    );
  });

  it("lists events with the resolved window", async () => {
    listEventsMock.mockResolvedValue([{ id: "e1" }] as never);

    const result = await handleListCalendarEvents({ timeMin: "{{previousStep.date}}" }, chain);

    expect(listEventsMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeMin: "2026-11-20" }),
    );
    expect(result).toMatchObject({ success: true, data: { count: 1 } });
  });

  it("validates the trigger payload", () => {
    expect(handleWatchCalendarEvents({})).toMatchObject({ success: false });
    expect(handleWatchCalendarEvents({}, undefined, { events: [{}] })).toMatchObject({
      success: true,
    });
  });
});

describe("drive handlers", () => {
  it("requires a file name and content", async () => {
    await expect(handleUploadFile({ content: "x" }, chain)).resolves.toMatchObject({
      success: false,
      message: "File name is required",
    });
    await expect(handleUploadFile({ fileName: "x.csv" }, chain)).resolves.toMatchObject({
      success: false,
      message: "File content is required",
    });
  });

  it("uploads with template-resolved values", async () => {
    uploadMock.mockResolvedValue({ id: "f1", name: "Ana.csv" } as never);

    await handleUploadFile({ fileName: "{{previousStep.name}}.csv", content: "a,b" }, chain);

    expect(uploadMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Ana.csv" }));
  });
});

describe("docs handlers", () => {
  it("requires a title", async () => {
    await expect(handleCreateDocument({}, chain)).resolves.toMatchObject({
      success: false,
      message: "Document title is required",
    });
  });

  it("creates the document and returns it", async () => {
    createDocMock.mockResolvedValue({ documentId: "d1", title: "Ana", text: "" } as never);

    const result = await handleCreateDocument({ title: "{{previousStep.name}}" }, chain);

    expect(createDocMock).toHaveBeenCalledWith("Ana");
    expect(result).toMatchObject({ success: true, data: { document: { documentId: "d1" } } });
  });

  it("requires a document id when appending", async () => {
    await expect(handleAppendText({ text: "x" }, chain)).resolves.toMatchObject({
      success: false,
      message: "Document ID is required",
    });
  });
});
