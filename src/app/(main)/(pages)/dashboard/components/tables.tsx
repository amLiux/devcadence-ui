"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatPercent, formatRelativeTime } from "@/lib/dashboard/format";
import type { DashboardFailingNode, DashboardWorkflowHealth } from "@/lib/dashboard/types";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    error: "bg-destructive/10 text-destructive border-destructive/30",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${colors[status] ?? colors.cancelled}`}
    >
      {status}
    </span>
  );
}

export function FailingNodesTable({ nodes }: { nodes: DashboardFailingNode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Nodes failing most</CardTitle>
      </CardHeader>
      <CardContent>
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No node failures in this period.
          </p>
        ) : (
          <ul className="space-y-2">
            {nodes.slice(0, 6).map((node) => (
              <li key={node.nodeType} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                    <span className="truncate">{node.nodeType}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-destructive">
                    {node.failures} {node.failures === 1 ? "failure" : "failures"}
                  </span>
                </div>
                {node.lastError && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground" title={node.lastError}>
                    {node.lastError}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  last {formatRelativeTime(node.lastFailedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkflowHealthTable({ workflows }: { workflows: DashboardWorkflowHealth[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Workflows needing attention</CardTitle>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No workflows ran in this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="pb-1 pr-2 font-medium">Workflow</th>
                  <th className="pb-1 pr-2 font-medium">Success</th>
                  <th className="pb-1 pr-2 font-medium">p95</th>
                  <th className="pb-1 pr-2 font-medium">Runs</th>
                  <th className="pb-1 font-medium">Last run</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="border-b last:border-0">
                    <td className="max-w-[180px] truncate py-1.5 pr-2">
                      <Link
                        href={`/workflows/editor/${workflow.id}`}
                        className="hover:underline"
                        title={workflow.name}
                      >
                        {workflow.name}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-2">{formatPercent(workflow.successRate)}</td>
                    <td className="py-1.5 pr-2">{formatDuration(workflow.p95DurationMs)}</td>
                    <td className="py-1.5 pr-2">{workflow.runs}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        <StatusBadge status={workflow.lastStatus} />
                        <span className="text-muted-foreground">
                          {formatRelativeTime(workflow.lastRunAt)}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
