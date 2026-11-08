"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plug,
  LayoutDashboard,
  Settings,
  LogOut,
  GitBranch,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface MenuOption {
  name: string;
  icon: LucideIcon;
  href: string;
  disabled?: boolean;
}

const menuOptions: MenuOption[] = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard", disabled: true },
  { name: "Workflows", icon: GitBranch, href: "/workflows" },
  { name: "Connections", icon: Plug, href: "/connections" },
  { name: "AI", icon: Sparkles, href: "/ai" },
  { name: "Docs", icon: BookOpen, href: "/docs" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const path = usePathname();
  // Subroutes such as /settings/notifications and /docs/nodes keep their parent active.
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <nav className="h-screen w-16 border-r border-border flex flex-col items-center py-4 bg-background shrink-0">
      <span className="text-lg font-bold text-primary mb-8">dd</span>
      {menuOptions.map((item) => (
        <Tooltip key={item.name}>
          <TooltipTrigger
            render={
              item.disabled ? (
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label={`${item.name} — coming soon`}
                  className="p-3 rounded-lg mb-2 text-muted-foreground/40 cursor-not-allowed"
                />
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`p-3 rounded-lg mb-2 transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : item.name === "AI"
                        ? "text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                />
              )
            }
          >
            <item.icon size={20} />
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.disabled ? `${item.name} — coming soon` : item.name}
          </TooltipContent>
        </Tooltip>
      ))}
      <div className="mt-auto flex flex-col items-center gap-4">
        <Separator className="mb-2 w-8" />
        <Tooltip>
          <TooltipTrigger
            render={
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />
            }
          >
            <LogOut size={18} />
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
