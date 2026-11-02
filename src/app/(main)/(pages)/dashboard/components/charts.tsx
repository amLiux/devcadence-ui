"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBucketLabel } from "@/lib/dashboard/format";
import type { DashboardRange, DashboardSource, DashboardVolumePoint } from "@/lib/dashboard/types";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

const volumeConfig = {
  success: { label: "Success", color: "hsl(142, 76%, 36%)" },
  error: { label: "Failed", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

const SOURCE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const sourceLabels: Record<string, string> = {
  webhook: "Webhook",
  schedule: "Schedule",
  manual: "Manual",
  subWorkflow: "Sub-workflow",
  "discord-listen": "Discord",
};

export function VolumeChart({
  volume,
  range,
}: {
  volume: DashboardVolumePoint[];
  range: DashboardRange;
}) {
  const data = volume.map((point) => ({
    ...point,
    label: formatBucketLabel(point.bucket, range),
  }));

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Run volume</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={volumeConfig} className="h-[250px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis className="text-xs" allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="success" stackId="runs" fill="hsl(142, 76%, 36%)" />
            <Bar dataKey="error" stackId="runs" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function SourceChart({ sources }: { sources: DashboardSource[] }) {
  const data = sources.map((source) => ({
    name: sourceLabels[source.source] ?? source.source,
    value: source.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Trigger sources</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No runs in this period.</p>
        ) : (
          <>
            <ChartContainer config={{}} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 space-y-1">
              {data.map((entry, index) => (
                <li key={entry.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                    />
                    {entry.name}
                  </span>
                  <span className="text-muted-foreground">{entry.value}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
