import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SubpageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  /** Short explanation under the title; accepts inline markup such as code. */
  description?: ReactNode;
  className?: string;
}

/** Header shared by docs and settings detail pages. */
export function SubpageHeader({
  backHref,
  backLabel,
  title,
  description,
  className,
}: SubpageHeaderProps) {
  return (
    <div className={cn(className)}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="h-3 w-3" />
        {backLabel}
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
