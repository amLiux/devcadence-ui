"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardRange } from "@/lib/dashboard/types";

const RANGE_LABELS: Record<DashboardRange, string> = {
  "24h": "the last 24 hours",
  "7d": "the last 7 days",
  "30d": "the last 30 days",
};

export function DashboardEmpty({ range }: { range: DashboardRange }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Activity className="h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold">No runs in {RANGE_LABELS[range]}</h3>
        <p className="max-w-sm text-xs text-muted-foreground">
          Test runs from the editor are excluded. Trigger a workflow or run it manually to start
          collecting real metrics here.
        </p>
        <Link href="/workflows">
          <Button size="sm" variant="outline">
            Go to workflows
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
