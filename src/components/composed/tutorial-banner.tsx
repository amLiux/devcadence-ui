"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTutorialProgress } from "@/hooks/use-tutorial-progress";
import { Button } from "@/components/ui/button";
import { Rocket, X } from "lucide-react";

export function TutorialBanner() {
  const { completed, reset } = useTutorialProgress();
  const [dismissed, setDismissed] = React.useState(false);
  const pathname = usePathname();

  if (completed || dismissed || pathname.startsWith("/docs")) return null;

  return (
    <div className="mx-6 mt-4 mb-2 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
      <Rocket className="h-4 w-4 text-primary shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">
        New to DevDock?{" "}
        <Link href="/docs/tutorial" className="text-primary font-medium hover:underline">
          Complete the tutorial
        </Link>{" "}
        to learn the basics.
      </p>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => setDismissed(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
