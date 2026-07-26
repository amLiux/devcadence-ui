import { prisma } from "@/lib/db";

const GITHUB_API = "https://api.github.com";

export async function getGitHubToken(): Promise<string | null> {
  const conn = await prisma.connection.findFirst({
    where: { type: "GitHub" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn) return null;
  const config = conn.config as Record<string, string>;
  return config.patToken || null;
}

interface FetchOptions {
  method?: string;
  body?: string;
}

export async function githubFetch(path: string, token: string, options?: FetchOptions) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method: options?.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options?.body ? { body: options.body } : {}),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}
