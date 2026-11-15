import { googleFetch } from "@/lib/google/token";

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetRows {
  spreadsheetId: string;
  range: string;
  rows: string[][];
  rowCount: number;
}

async function failSheets(response: Response, range: string): Promise<never> {
  const body = await response.text();
  let detail = body;
  try {
    detail = JSON.parse(body)?.error?.message ?? body;
  } catch {
    // keep raw body
  }

  if (/unable to parse range/i.test(detail)) {
    throw new Error(
      `Sheets could not parse the range "${range}". Use A1:B2 for the first tab, or quote the tab name when it has spaces: 'Hoja 1'!A1:B2.`,
    );
  }
  if (/storage quota/i.test(detail)) {
    throw new Error(
      "Sheets: the Google account has no storage left. Free space in Drive/Gmail and retry.",
    );
  }
  if (response.status === 401) {
    throw new Error("Google authorization expired. Reconnect the Google account.");
  }
  if (response.status === 403) {
    throw new Error(
      `Sheets permission denied. Reconnect with the Sheets service selected. (${detail})`,
    );
  }
  if (response.status === 404) {
    throw new Error("Sheets: the spreadsheet was not found. Check the spreadsheet ID.");
  }
  if (response.status === 429) {
    throw new Error("Sheets rate limit reached. Retry later.");
  }
  throw new Error(`Sheets API ${response.status}: ${detail}`);
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
    await failSheets(response, input.range);
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
    await failSheets(response, input.range);
  }

  const body = (await response.json()) as {
    updates?: { updatedRange?: string; updatedRows?: number };
  };
  return {
    updatedRange: body.updates?.updatedRange ?? input.range,
    updatedRows: body.updates?.updatedRows ?? input.rows.length,
  };
}
