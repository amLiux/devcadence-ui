"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, DollarSign, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell } from "recharts";

const monthlyUsage = [
  { month: "Jan", calls: 120, tokens: 45000 },
  { month: "Feb", calls: 180, tokens: 68000 },
  { month: "Mar", calls: 250, tokens: 95000 },
  { month: "Apr", calls: 310, tokens: 120000 },
  { month: "May", calls: 420, tokens: 165000 },
  { month: "Jun", calls: 580, tokens: 230000 },
  { month: "Jul", calls: 720, tokens: 290000 },
];

const successRate = [
  { day: "Mon", success: 94, failed: 6 },
  { day: "Tue", success: 88, failed: 12 },
  { day: "Wed", success: 96, failed: 4 },
  { day: "Thu", success: 91, failed: 9 },
  { day: "Fri", success: 97, failed: 3 },
  { day: "Sat", success: 99, failed: 1 },
  { day: "Sun", success: 95, failed: 5 },
];

const costBreakdown = [
  { name: "GPT-4o", value: 42, fill: "var(--color-chart-1)" },
  { name: "Claude Sonnet", value: 28, fill: "var(--color-chart-2)" },
  { name: "GPT-4o Mini", value: 18, fill: "var(--color-chart-3)" },
  { name: "Other", value: 12, fill: "var(--color-chart-4)" },
];

const usageConfig = {
  calls: { label: "API Calls", color: "var(--color-chart-1)" },
  tokens: { label: "Tokens (k)", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

const successConfig = {
  success: { label: "Success", color: "hsl(142, 76%, 36%)" },
  failed: { label: "Failed", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

const costConfig = {
  GPT4o: { label: "GPT-4o", color: "var(--color-chart-1)" },
  Claude: { label: "Claude Sonnet", color: "var(--color-chart-2)" },
  Mini: { label: "GPT-4o Mini", color: "var(--color-chart-3)" },
  Other: { label: "Other", color: "var(--color-chart-4)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your automation platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,580</div>
            <p className="text-xs text-muted-foreground">+24% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95.2%</div>
            <p className="text-xs text-muted-foreground">+1.8% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$34.20</div>
            <p className="text-xs text-muted-foreground">This billing cycle</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">AI Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={usageConfig} className="h-[250px] w-full">
              <LineChart data={monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="calls" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ fill: "var(--color-chart-1)" }} />
                <Line type="monotone" dataKey="tokens" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ fill: "var(--color-chart-2)" }} yAxisId={0} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={costConfig} className="h-[250px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} strokeWidth={2}>
                  {costBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Workflow Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={successConfig} className="h-[200px] w-full">
              <BarChart data={successRate}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="success" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
