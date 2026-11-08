export function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1_000)}s`;
}

export function runTitle(run: { status: string; error: string | null }): string {
  if (run.status === "error") return run.error?.slice(0, 50) ?? "Failed";
  if (run.status === "running") return "Running...";
  return "Completed";
}

export function canRetryRun(run: { status: string; source: string }): boolean {
  return run.status === "error" && run.source !== "subWorkflow" && run.source !== "test";
}
