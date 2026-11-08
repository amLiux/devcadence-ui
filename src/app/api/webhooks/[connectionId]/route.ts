import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnectionConfigById } from "@/lib/connection-config";
import { createHmac } from "crypto";
import { executeWebhook } from "@/lib/workflows/execute-webhook";

function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${expected}` === signature;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  try {
    const { connectionId } = await params;

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.type !== "Webhook") {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const config = (await getConnectionConfigById(connectionId)) as Record<string, string>;
    const secret = config.secret;

    if (secret) {
      const signature =
        req.headers.get("x-hub-signature-256") || req.headers.get("x-webhook-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
      }

      const rawBody = await req.text();
      if (!verifyHmacSignature(rawBody, secret, signature)) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }

      const result = await executeWebhook(connectionId, JSON.parse(rawBody));
      return NextResponse.json(result.payload, {
        status: result.status,
        headers: result.headers,
      });
    }

    const result = await executeWebhook(connectionId, await req.json());
    return NextResponse.json(result.payload, {
      status: result.status,
      headers: result.headers,
    });
  } catch (error) {
    console.error(
      "POST /api/webhooks/[connectionId] error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook execution failed" },
      { status: 500 },
    );
  }
}
