import { ArrowRight, LogIn, ShieldOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DisabledNotice() {
  return (
    <>
      <div className="mt-5 flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
        <ShieldOff className="mt-0.5 size-4 shrink-0" />
        <p>
          Authentication is disabled on this instance. Set{" "}
          <code className="font-mono text-xs">AUTH_MODE=oidc</code> or{" "}
          <code className="font-mono text-xs">AUTH_MODE=hortus</code> and restart to enable
          sign-in.
        </p>
      </div>
      <span
        aria-disabled
        className={cn(buttonVariants({ size: "lg" }), "mt-6 h-11 w-full text-sm opacity-50")}
      >
        <LogIn className="size-4" />
        Continue with SSO
        <ArrowRight className="ml-auto size-4" />
      </span>
    </>
  );
}
