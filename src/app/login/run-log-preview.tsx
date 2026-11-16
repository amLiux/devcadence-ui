"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  { node: "Webhook Trigger", ms: "0ms" },
  { node: "PostgreSQL Query", ms: "240ms" },
  { node: "AI Extract", ms: "1.1s" },
  { node: "Slack Send Message", ms: "380ms" },
];

export function RunLogPreview() {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const showAll = window.setTimeout(() => setVisible(STEPS.length), 0);
      return () => window.clearTimeout(showAll);
    }

    let step = 1;
    const timer = window.setInterval(() => {
      step += 1;
      if (step > STEPS.length + 2) step = 1;
      setVisible(Math.min(step, STEPS.length));
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-0.5" aria-hidden>
      {STEPS.map((step, index) => {
        const shown = index < visible;
        return (
          <div
            key={step.node}
            className={cn(
              "flex items-center gap-2 rounded px-1.5 py-1 text-[11px] transition-all duration-500",
              shown ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0",
            )}
          >
            <span className="w-4 shrink-0 text-right text-muted-foreground">{index + 1}</span>
            <span className={shown ? "text-emerald-500" : "text-muted-foreground"}>✓</span>
            <span className="font-medium">{step.node}</span>
            <span className="text-muted-foreground">{step.ms}</span>
            {shown && index === visible - 1 && visible < STEPS.length ? (
              <span className="ml-auto animate-pulse font-mono text-emerald-500">▍</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
