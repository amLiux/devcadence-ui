import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Replaces the icon with a custom mark, such as a completion check. */
  leading?: ReactNode;
  /** Optional label before the arrow, such as "New". */
  badge?: ReactNode;
  /** Optional inline label after the title, such as "Completed". */
  status?: ReactNode;
  className?: string;
}

/** One row of a docs/settings hub: icon, title, description and an arrow. */
export function SectionCard({
  href,
  title,
  description,
  icon,
  leading,
  badge,
  status,
  className,
}: SectionCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          "group hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer",
          className,
        )}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="shrink-0">{leading ?? icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm flex items-center gap-2">
              {title}
              {status}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          </div>
          {badge}
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
