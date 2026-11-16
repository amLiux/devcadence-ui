import { ArrowRight, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SsoButton({ next }: { next: string }) {
  return (
    <a
      href={`/api/auth/login?next=${encodeURIComponent(next)}`}
      className={cn(buttonVariants({ size: "lg" }), "group mt-6 h-11 w-full text-sm")}
    >
      <LogIn className="size-4" />
      Continue with SSO
      <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
