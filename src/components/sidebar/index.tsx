"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plug, LayoutDashboard, Settings, LogOut, GitBranch, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const menuOptions = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Workflows", icon: GitBranch, href: "/workflows" },
  { name: "Connections", icon: Plug, href: "/connections" },
  { name: "AI", icon: Sparkles, href: "/ai" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <nav className="h-screen w-16 border-r border-border flex flex-col items-center py-4 bg-background shrink-0">
      <Link href="/dashboard" className="text-lg font-bold text-primary mb-8">
        dd
      </Link>
      {menuOptions.map((item) => (
        <Tooltip key={item.name}>
          <TooltipTrigger
            render={
              <Link
                href={item.href}
                className={`p-3 rounded-lg mb-2 transition-colors ${
                  path === item.href ||
                  (item.href === "/workflows" && path.startsWith("/workflows"))
                    ? "bg-primary/10 text-primary"
                    : item.name === "AI"
                      ? "text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              />
            }
          >
            <item.icon size={20} />
          </TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
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
