import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ConnectionResponse } from "@/lib/types";

interface ConnectionRequestBody {
  connectionType: string;
  data: Record<string, string>;
}

const SENSITIVE_KEYS = [
  "personalAccessToken",
  "botToken",
  "apiKey",
  "accessToken",
  "credentialsJson",
];

const RESERVED_KEYS = [...SENSITIVE_KEYS, "name", "description"];

function getTokenFromData(data: Record<string, string>): string {
  for (const key of SENSITIVE_KEYS) {
    if (data[key]) return data[key];
  }
  return "";
}

function buildSettings(data: Record<string, string>) {
  return Object.entries(data)
    .filter(([key]) => !RESERVED_KEYS.includes(key))
    .map(([key, value]) => ({ key, value: String(value) }));
}

function simplifyConnection(repo: {
  id: string;
  name: string;
  description: string;
  url: string;
  branch: string;
  updatedAt: Date;
}): ConnectionResponse {
  return {
    id: repo.id,
    name: repo.name,
    description: repo.description,
    type: "GitHub",
    formData: { repoUrl: repo.url, branch: repo.branch },
    lastUpdate: repo.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const connections = await prisma.repository.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(connections.map(simplifyConnection));
  } catch (error) {
    console.error("GET /api/connections error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConnectionRequestBody;
    const { connectionType, data } = body;

    const repo = await prisma.repository.create({
      data: {
        name: data.name || "untitled",
        description: data.description || "",
        url: data.repoUrl ?? "",
        patToken: getTokenFromData(data),
        branch: "main",
        settings: {
          create: buildSettings(data),
        },
      },
      include: { settings: true },
    });

    const response: ConnectionResponse = {
      id: repo.id,
      name: repo.name,
      description: repo.description,
      type: connectionType,
      formData: { repoUrl: repo.url, branch: repo.branch },
      lastUpdate: repo.updatedAt.toISOString(),
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
