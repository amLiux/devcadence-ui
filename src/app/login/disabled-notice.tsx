import { ArrowRight, LogIn, ShieldOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DisabledNotice() {
  return (
    <>
      <div className="mt-4 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
        <ShieldOff className="mt-0.5 size-4 shrink-0" />
        <p>
          auth is disabled on this instance. set{" "}
          <code className="font-mono">AUTH_MODE=oidc</code> or{" "}
          <code className="font-mono">AUTH_MODE=hortus</code> and restart.
        </p>
      </div>
      <span
        aria-disabled
        className={cn(buttonVariants({ size: "lg" }), "mt-5 h-9 w-full text-sm opacity-50")}
      >
        <LogIn className="size-4" />
        continue with sso
        <ArrowRight className="ml-auto size-4" />
      </span>
    </>
  );
}
