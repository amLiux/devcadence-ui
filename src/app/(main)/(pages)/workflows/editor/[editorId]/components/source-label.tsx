const LABELS: Record<string, string> = {
  test: "Test",
  webhook: "Webhook",
  manual: "Manual",
  schedule: "Schedule",
  subWorkflow: "Sub-workflow",
};

export function SourceLabel({ source }: { source: string }) {
  return <span className="text-[10px] text-muted-foreground">{LABELS[source] || source}</span>;
}
