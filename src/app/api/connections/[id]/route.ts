import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ConnectionResponse } from "@/lib/types";

interface PutRequestBody {
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.repoSetting.deleteMany({ where: { repoId: id } });
    await prisma.repository.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/connections error:", error);
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as PutRequestBody;
    const { data } = body;

    const repo = await prisma.repository.update({
      where: { id },
      data: {
        name: data.name || undefined,
        description: data.description || undefined,
        url: data.repoUrl ?? "",
        patToken: getTokenFromData(data),
        settings: {
          deleteMany: {},
          create: buildSettings(data),
        },
      },
      include: { settings: true },
    });

    const response: ConnectionResponse = {
      id: repo.id,
      name: repo.name,
      description: repo.description,
      type: "GitHub",
      formData: { repoUrl: repo.url, branch: repo.branch },
      lastUpdate: repo.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PUT /api/connections error:", error);
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }
}
