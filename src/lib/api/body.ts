import { NextResponse } from "next/server";
import type { z } from "zod";

export type BodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function formatIssue(issue: {
  path: PropertyKey[];
  message: string;
  code?: string;
}): string {
  const path = issue.path.map(String).join(".");
  if (issue.code === "invalid_type" && /received undefined/.test(issue.message)) {
    return path ? `${path} is required` : "Request body is required";
  }
  return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Reads and validates a JSON request body against a zod schema.
 *
 * Malformed JSON, wrong field types and missing required fields all return a
 * 400 with a readable message instead of surfacing as a 500.
 */
export async function readJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<BodyResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: formatIssue(parsed.error.issues[0]) },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
