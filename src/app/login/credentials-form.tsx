import { ArrowRight, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "./form-styles";

export function CredentialsForm({ next }: { next: string }) {
  return (
    <form method="post" action="/api/auth/login" className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
          Email
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
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
          Password
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
      <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 w-full text-sm")}>
        <LogIn className="size-4" />
        Sign in
        <ArrowRight className="ml-auto size-4" />
      </button>
    </form>
  );
}
