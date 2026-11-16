import { BarChart3, GitBranch, ShieldCheck, Workflow } from "lucide-react";
import { BrandMark } from "./brand-mark";

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual workflows",
    description: "Compose triggers, actions and reusable sub-workflows on one canvas.",
  },
  {
    icon: BarChart3,
    title: "Full observability",
    description: "Every run, retry and log line in one place, with no extra setup.",
  },
  {
    icon: ShieldCheck,
    title: "Yours to host",
    description: "Self-hosted, OIDC-native and free of vendor lock-in.",
  },
];

export function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.20),transparent_45%),radial-gradient(circle_at_82%_0%,rgba(99,102,241,0.18),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />

      <div className="relative flex items-center gap-3">
        <BrandMark />
        <div>
          <p className="text-sm font-semibold tracking-tight">DevCadence</p>
          <p className="text-xs text-white/50">Workflow automation for people who ship</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <GitBranch className="size-3.5 text-emerald-400" />
          Self-hosted by design
        </p>
        <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight">
          Ship the workflow,
          <br />
          not the busywork.
        </h2>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Build automations across your repos, databases and tools, then watch every run
          without leaving the dashboard.
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
                <Icon className="size-4 text-emerald-400" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-white/50">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 text-[11px] text-white/40">
        <span className="rounded-md border border-white/10 px-2 py-1">OpenID Connect</span>
        <span className="rounded-md border border-white/10 px-2 py-1">PKCE S256</span>
        <span className="rounded-md border border-white/10 px-2 py-1">RS256</span>
        <span className="ml-auto">© {new Date().getFullYear()} DevCadence</span>
      </div>
    </section>
  );
}
