import { BrandMark } from "./brand-mark";

interface LogLine {
  time: string;
  level: "info" | "warn" | "done";
  node: string;
  message: string;
  status: "ok" | "retry" | "done";
}

const RUN_LOG: LogLine[] = [
  { time: "09:41:02", level: "info", node: "trigger", message: "github.push main", status: "ok" },
  { time: "09:41:02", level: "info", node: "build-image", message: "docker build", status: "ok" },
  { time: "09:41:03", level: "info", node: "migrate-db", message: "postgres migrate", status: "ok" },
  { time: "09:41:03", level: "warn", node: "notify-slack", message: "retry 1/3", status: "retry" },
  { time: "09:41:04", level: "info", node: "notify-slack", message: "message delivered", status: "ok" },
  { time: "09:41:04", level: "done", node: "run", message: "#4821 success 2.8s", status: "done" },
];

const LEVEL_COLOR: Record<LogLine["level"], string> = {
  info: "text-zinc-500",
  warn: "text-amber-400",
  done: "text-emerald-400",
};

const STATUS_MARK: Record<LogLine["status"], string> = {
  ok: "✓",
  retry: "↻",
  done: "●",
};

const PIPELINE = ["github", "docker", "postgres", "slack"];

export function BrandPanel() {
  return (
    <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 bg-[#0b0d0f] p-10 text-zinc-300 lg:flex">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="font-mono text-sm lowercase tracking-tight text-white">devcadence</p>
            <p className="font-mono text-[11px] text-zinc-500">self-hosted runner</p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-zinc-600">v0.1.0</span>
      </header>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#08090a]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 font-mono text-[11px] text-zinc-500">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span>run.log</span>
            <span className="text-zinc-700">·</span>
            <span>live</span>
            <span className="ml-auto">#4821</span>
          </div>

          <div className="space-y-1.5 p-3 font-mono text-[11px] leading-5">
            {RUN_LOG.map((line) => (
              <div key={`${line.time}-${line.node}-${line.message}`} className="flex gap-2">
                <span className="text-zinc-600">{line.time}</span>
                <span className={`w-9 uppercase ${LEVEL_COLOR[line.level]}`}>{line.level}</span>
                <span className="w-24 shrink-0 text-zinc-400">{line.node}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">{line.message}</span>
                <span className={line.status === "done" ? "text-emerald-400" : "text-zinc-500"}>
                  {STATUS_MARK[line.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          {PIPELINE.map((node, index) => (
            <span key={node} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-zinc-700">→</span> : null}
              <span className="rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5">
                {node}
              </span>
            </span>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between font-mono text-[10px] text-zinc-600">
        <span>self-hosted · no telemetry</span>
        <span>workflow automation</span>
      </footer>
    </section>
  );
}
