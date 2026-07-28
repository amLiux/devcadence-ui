"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Globe, Sparkles, Link2, Plug, BookOpen, GitBranch, Check, Code, GitFork, ArrowRightLeft } from "lucide-react";
import { useDocsProgress, type DocsPage } from "@/hooks/use-tutorial-progress";

const topics: { title: string; description: string; href: string; icon: React.ReactNode; tag: string; tagColor?: string; page: DocsPage }[] = [
  {
    title: "Build Your First Workflow",
    description: "Interactive tutorial — drag nodes, connect them, see data flow. Start here.",
    href: "/docs/tutorial",
    icon: <GitBranch className="h-5 w-5" />,
    tag: "Start here",
    tagColor: "text-primary",
    page: "tutorial",
  },
  {
    title: "Interactive Workflow",
    description: "See how a 3-node workflow runs end-to-end. Click nodes to inspect data at each step.",
    href: "/docs/workflow",
    icon: <Globe className="h-5 w-5" />,
    tag: "Watch",
    page: "workflow",
  },
  {
    title: "Connecting Nodes",
    description: "Link nodes together and watch data flow through a real weather API pipeline.",
    href: "/docs/connecting",
    icon: <Link2 className="h-5 w-5" />,
    tag: "Try it",
    page: "connecting",
  },
  {
    title: "Template Variables",
    description: "Use {{expression}} to reference data from previous nodes in any text field.",
    href: "/docs/template-variables",
    icon: <Code className="h-5 w-5" />,
    tag: "Quiz",
    page: "template-variables",
  },
  {
    title: "Conditional Logic",
    description: "Branch your workflow with Yes/No paths based on expressions.",
    href: "/docs/conditional-logic",
    icon: <GitFork className="h-5 w-5" />,
    tag: "Quiz",
    page: "conditional-logic",
  },
  {
    title: "Reusable Workflows",
    description: "Use workflows as nodes. Write auth once, call from any workflow.",
    href: "/docs/reusable-workflows",
    icon: <ArrowRightLeft className="h-5 w-5" />,
    tag: "New",
    tagColor: "text-emerald-500",
    page: "reusable-workflows",
  },
  {
    title: "Node Types",
    description: "HTTP Request, Transform, AI, Conditional, PostgreSQL — settings and examples for each.",
    href: "/docs/nodes",
    icon: <Sparkles className="h-5 w-5" />,
    tag: "Reference",
    page: "nodes",
  },
  {
    title: "Connections & Triggers",
    description: "Select a connection to see its config form and which nodes it unlocks.",
    href: "/docs/connections",
    icon: <Plug className="h-5 w-5" />,
    tag: "Explore",
    page: "connections",
  },
];

const iconColors: Record<string, string> = {
  tutorial: "text-primary",
  workflow: "text-blue-500",
  connecting: "text-green-500",
  connections: "text-yellow-500",
  nodes: "text-purple-500",
  "template-variables": "text-cyan-500",
  "conditional-logic": "text-amber-500",
  "reusable-workflows": "text-emerald-500",
};

export default function DocsPage() {
  const { isPageDone, doneCount, total, percent, allDone } = useDocsProgress();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Documentation</h1>
        <p className="text-muted-foreground mt-1">
          Learn DevDock by doing. Start with the tutorial, then explore the rest.
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {allDone ? "All complete!" : `${doneCount} of ${total} completed`}
          </span>
          <span className="text-xs font-semibold">{percent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {topics.map((topic) => {
          const done = isPageDone(topic.page);
          return (
            <Link key={topic.href} href={topic.href}>
              <Card
                className={`group hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer ${
                  done
                    ? "border-green-500/30 bg-green-500/5"
                    : topic.page === "tutorial" && !allDone
                      ? "border-primary/30 bg-primary/5"
                      : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="shrink-0">
                    {done ? (
                      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <span className={iconColors[topic.page]}>{topic.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {topic.title}
                      {done && <span className="text-[10px] text-green-500 font-medium">Completed</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{topic.description}</div>
                  </div>
                  <span className={`text-[10px] shrink-0 font-medium ${topic.tagColor || "text-muted-foreground"}`}>{topic.tag}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
