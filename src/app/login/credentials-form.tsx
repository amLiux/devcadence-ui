import { ArrowRight, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "./form-styles";

export function CredentialsForm({ next }: { next: string }) {
  return (
    <form method="post" action="/api/auth/login" className="mt-5 space-y-3">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          className={INPUT_CLASS}
          required
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="password"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={INPUT_CLASS}
          required
        />
      </div>
      <button
        type="submit"
        className={cn(buttonVariants({ size: "lg" }), "mt-1 h-9 w-full text-sm")}
      >
        <LogIn className="size-4" />
        sign in
        <ArrowRight className="ml-auto size-4" />
      </button>
    </form>
  );
}
