import { googleFetch } from "@/lib/google/token";
import { failGoogleRequest } from "@/lib/google/errors";

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetRows {
  spreadsheetId: string;
  range: string;
  rows: string[][];
  rowCount: number;
}

function toRows(values: unknown[][] | undefined): string[][] {
  return (values ?? []).map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

export async function readRows(input: {
  spreadsheetId: string;
  range: string;
}): Promise<SheetRows> {
  const url = `${SHEETS}/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(
    input.range,
  )}?majorDimension=ROWS`;

  const response = await googleFetch(url);
  if (!response.ok) {
    await failGoogleRequest(response, "Sheets", "Reconnect with the Sheets service selected.");
  }

  const body = (await response.json()) as { range?: string; values?: unknown[][] };
  const rows = toRows(body.values);
  return {
    spreadsheetId: input.spreadsheetId,
    range: body.range ?? input.range,
    rows,
    rowCount: rows.length,
  };
}

export async function appendRows(input: {
  spreadsheetId: string;
  range: string;
  rows: string[][];
}): Promise<{ updatedRange: string; updatedRows: number }> {
  const params = new URLSearchParams({
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
  });
  const url = `${SHEETS}/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(
    input.range,
  )}:append?${params.toString()}`;

  const response = await googleFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: input.rows }),
  });
  if (!response.ok) {
    await failGoogleRequest(response, "Sheets", "Reconnect with the Sheets service selected.");
  }

  const body = (await response.json()) as {
    updates?: { updatedRange?: string; updatedRows?: number };
  };
  return {
    updatedRange: body.updates?.updatedRange ?? input.range,
    updatedRows: body.updates?.updatedRows ?? input.rows.length,
  };
}
