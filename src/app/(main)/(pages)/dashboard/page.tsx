"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { DASHBOARD_RANGES } from "@/lib/dashboard/types";
import type { DashboardRange, DashboardStats } from "@/lib/dashboard/types";
import { DashboardEmpty } from "./components/dashboard-empty";
import { KpiCards } from "./components/kpi-cards";
import { SourceChart, VolumeChart } from "./components/charts";
import { FailingNodesTable, WorkflowHealthTable } from "./components/tables";

const RANGE_LABELS: Record<DashboardRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4" data-testid="dashboard-skeleton">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2 h-[300px] animate-pulse bg-muted/40" />
        <Card className="h-[300px] animate-pulse bg-muted/40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="h-[220px] animate-pulse bg-muted/40" />
        <Card className="h-[220px] animate-pulse bg-muted/40" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { request } = useApi();
  const [range, setRange] = useState<DashboardRange>("7d");
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(
    async (nextRange: DashboardRange) => {
      setLoading(true);
      setError(null);

      try {
        const stats = await request<DashboardStats>({
          endpoint: `/api/dashboard?range=${nextRange}`,
        });
        if (stats) {
          setData(stats);
          setUpdatedAt(new Date());
        }
      } catch {
        setError("Could not load the dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  useEffect(() => {
    // This state update happens after the fetch resolves, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(range);
  }, [load, range]);

  const hasRuns = (data?.kpis.runs.value ?? 0) > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {RANGE_LABELS[range]}
            <span className="text-xs">· excludes test runs</span>
            {data && data.kpis.running > 0 && (
              <Badge variant="secondary" className="animate-pulse text-[10px]">
                {data.kpis.running} running
              </Badge>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {DASHBOARD_RANGES.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === range ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setRange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load(range)}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
            <Button size="sm" variant="outline" onClick={() => void load(range)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && loading && !data && <DashboardSkeleton />}

      {!error && data && !hasRuns && <DashboardEmpty range={range} />}

      {!error && data && hasRuns && (
        <>
          <KpiCards kpis={data.kpis} />

          <div className="grid gap-4 md:grid-cols-3">
            <VolumeChart volume={data.volume} range={data.range} />
            <SourceChart sources={data.sources} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FailingNodesTable nodes={data.failingNodes} />
            <WorkflowHealthTable workflows={data.workflows} />
          </div>

          {updatedAt && (
            <p className="text-right text-[10px] text-muted-foreground">
              Updated {updatedAt.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
