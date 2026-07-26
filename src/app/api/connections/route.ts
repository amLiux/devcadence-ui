import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Connection } from "@/lib/types";

interface ConnectionRequestBody {
  type: string;
  name: string;
  description?: string;
  config: Record<string, string>;
}

export async function GET() {
  try {
    const connections = await prisma.connection.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const response: Connection[] = connections.map((c) => ({
      id: c.id,
      type: c.type as Connection["type"],
      name: c.name,
      description: c.description,
      config: c.config as Record<string, string>,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/connections error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConnectionRequestBody;
    const { type, name, description, config } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type and name are required" }, { status: 400 });
    }

    const connection = await prisma.connection.create({
      data: {
        type,
        name,
        description: description || "",
        config: config || {},
      },
    });

    const response: Connection = {
      id: connection.id,
      type: connection.type as Connection["type"],
      name: connection.name,
      description: connection.description,
      config: connection.config as Record<string, string>,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/connections error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connection" },
      { status: 500 },
    );
  }
}
