"use client";

import { Activity, Clock, Coins, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDelta,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTokens,
} from "@/lib/dashboard/format";
import type { DashboardKpis } from "@/lib/dashboard/types";

type Tone = "up-good" | "down-good" | "neutral";

function Delta({ value, unit, tone }: { value: number | null; unit: "pct" | "pp"; tone: Tone }) {
  const { label, direction } = formatDelta(value, unit);

  let className = "text-muted-foreground";
  if (tone !== "neutral" && direction !== "flat") {
    const good = tone === "up-good" ? direction === "up" : direction === "down";
    className = good ? "text-emerald-600" : "text-destructive";
  }

  return (
    <p className="text-xs text-muted-foreground">
      <span className={className}>{label}</span> vs previous
    </p>
  );
}

export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  const cards = [
    {
      key: "runs",
      title: "Runs",
      icon: <Activity className="h-4 w-4 text-muted-foreground" />,
      value: formatNumber(kpis.runs.value),
      delta: <Delta value={kpis.runs.deltaPct} unit="pct" tone="up-good" />,
    },
    {
      key: "success",
      title: "Success rate",
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      value: formatPercent(kpis.successRate.value),
      delta: <Delta value={kpis.successRate.deltaPp} unit="pp" tone="up-good" />,
    },
    {
      key: "p95",
      title: "p95 duration",
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      value: formatDuration(kpis.p95DurationMs.value),
      delta: <Delta value={kpis.p95DurationMs.deltaPct} unit="pct" tone="down-good" />,
    },
    {
      key: "tokens",
      title: "AI tokens",
      icon: <Coins className="h-4 w-4 text-muted-foreground" />,
      value: formatTokens(kpis.aiTokens.value),
      delta: <Delta value={kpis.aiTokens.deltaPct} unit="pct" tone="neutral" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.delta}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
