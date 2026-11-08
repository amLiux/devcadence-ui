export function NodeCardSummary({
  summary,
  description,
}: {
  summary: string | null;
  description: string;
}) {
  if (summary) {
    return (
      <p className="text-[11px] text-muted-foreground mb-1.5 truncate font-mono" title={summary}>
        {summary}
      </p>
    );
  }
  if (description) {
    return <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{description}</p>;
  }
  return null;
}
