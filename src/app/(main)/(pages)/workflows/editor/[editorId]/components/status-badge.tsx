const COLORS: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  error: "bg-red-500/10 text-red-600 border-red-500/30",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse",
  queued: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
        COLORS[status] || COLORS.error
      }`}
    >
      {status}
    </span>
  );
}
