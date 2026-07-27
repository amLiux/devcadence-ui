"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ChevronLeft, ChevronDown, ChevronRight, Globe, Sparkles, GitBranch, Database, Zap, Mail, Terminal } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

interface NodeDoc {
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  requires: string;
  settings: { key: string; desc: string }[];
  examples: string[];
}

const NODE_DOCS: NodeDoc[] = [
  {
    title: "HTTP Request",
    icon: <Globe className="h-4 w-4 text-blue-500" />,
    color: "border-blue-500/30",
    description: "Makes HTTP requests to any URL. Supports all methods, custom headers, and JSON bodies. GET requests are cached for 5 minutes.",
    requires: "None",
    settings: [
      { key: "url", desc: "Request URL. Supports {{expression}} template variables." },
      { key: "method", desc: "GET, POST, PUT, PATCH, DELETE." },
      { key: "headers", desc: "JSON object for auth tokens, content types, etc." },
      { key: "body", desc: "JSON payload for POST/PUT/PATCH." },
    ],
    examples: [
      "GET https://api.github.com/repos/{{previousStep.repo}}/commits",
      'POST with body: {"title": "{{previousStep.title}}"}',
    ],
  },
  {
    title: "Transform Data",
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    color: "border-purple-500/30",
    description: "Evaluates JavaScript expressions to reshape data. Pure expressions only — no side effects, no async.",
    requires: "A parent node (receives its output as previousStep)",
    settings: [
      { key: "expression", desc: "JS expression. Access parent output via previousStep." },
    ],
    examples: [
      "previousStep.body.map(c => c.commit.message)",
      "previousStep.body.filter(c => c.status === 'active')",
      "({ name: previousStep.body.name, role: 'admin' })",
    ],
  },
  {
    title: "Conditional",
    icon: <GitBranch className="h-4 w-4 text-amber-500" />,
    color: "border-amber-500/30",
    description: "Branches execution based on a boolean expression. Two output handles: Yes and No.",
    requires: "A parent node",
    settings: [
      { key: "expression", desc: "Boolean expression. Must return true or false." },
    ],
    examples: [
      "previousStep.status === 200",
      "previousStep.body.length > 0",
      "previousStep.classification === 'bug'",
    ],
  },
  {
    title: "AI — Prompt",
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    color: "border-purple-500/30",
    description: "Sends a prompt to an AI model and returns the response. System prompt assembled from Persona → Context → Memory → Node instructions.",
    requires: "AI connection (OpenAI or Claude)",
    settings: [
      { key: "systemPrompt", desc: "Base system prompt (used if no persona selected)." },
      { key: "prompt", desc: "User message. Supports {{expression}}." },
      { key: "personaId", desc: "Select a persona for identity and tone." },
      { key: "contextIds", desc: "Comma-separated context IDs for project knowledge." },
      { key: "memoryIds", desc: "Comma-separated memory IDs for persistent instructions." },
    ],
    examples: [
      "Summarize the following: {{previousStep.content}}",
      "Review this code for bugs: {{previousStep.diff}}",
    ],
  },
  {
    title: "AI — Classify",
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    color: "border-purple-500/30",
    description: "Classifies text into one of the provided categories. Returns only the category name.",
    requires: "AI connection (OpenAI or Claude)",
    settings: [
      { key: "text", desc: "Text to classify. Supports {{expression}}." },
      { key: "categories", desc: "Comma-separated list of categories." },
    ],
    examples: [
      "Categories: bug, feature, question — Classify: {{previousStep.issue.body}}",
    ],
  },
  {
    title: "AI — Extract",
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    color: "border-purple-500/30",
    description: "Extracts structured data from text. Returns a JSON object with the extracted fields.",
    requires: "AI connection (OpenAI or Claude)",
    settings: [
      { key: "text", desc: "Text to extract from. Supports {{expression}}." },
      { key: "fields", desc: "Comma-separated field names to extract." },
    ],
    examples: [
      "Fields: name, email, priority — Extract from: {{previousStep.content}}",
    ],
  },
  {
    title: "PostgreSQL",
    icon: <Database className="h-4 w-4 text-green-500" />,
    color: "border-green-500/30",
    description: "Query and modify PostgreSQL databases. Four node types: Query, Insert, Update, Delete. All use parameterized queries.",
    requires: "PostgreSQL connection",
    settings: [
      { key: "connectionId", desc: "PostgreSQL connection to use." },
      { key: "table", desc: "Target table name." },
      { key: "sql", desc: "SELECT query (Query node)." },
      { key: "columns / values", desc: "INSERT columns and values." },
      { key: "setClause / whereClause", desc: "UPDATE SET and WHERE." },
      { key: "whereClause", desc: "DELETE WHERE (empty = delete all)." },
    ],
    examples: [
      "SELECT * FROM users WHERE id = {{previousStep.userId}}",
      "INSERT name, email VALUES {{previousStep.name}}, {{previousStep.email}}",
    ],
  },
  {
    title: "Webhook Trigger",
    icon: <Zap className="h-4 w-4 text-yellow-500" />,
    color: "border-yellow-500/30",
    description: "Receives incoming HTTP webhooks to start a workflow. Optional HMAC-SHA256 signature verification.",
    requires: "Webhook connection (optional secret)",
    settings: [
      { key: "connectionId", desc: "Webhook connection with optional HMAC secret." },
      { key: "testPayload", desc: "JSON payload used when testing." },
    ],
    examples: [
      "POST to /api/webhooks/:connectionId with JSON body",
    ],
  },
];

function NodeDocCard({ doc }: { doc: NodeDoc }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={`overflow-hidden ${doc.color}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="shrink-0">{doc.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{doc.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{doc.description}</div>
        </div>
        <Badge variant="outline" className="text-[9px] shrink-0">{doc.requires}</Badge>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">Settings:</p>
            <div className="space-y-1">
              {doc.settings.map((s) => (
                <div key={s.key} className="flex items-start gap-2 text-xs">
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] shrink-0">{s.key}</code>
                  <span className="text-muted-foreground">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">Examples:</p>
            <div className="space-y-1">
              {doc.examples.map((ex, i) => (
                <div key={i} className="text-[11px] font-mono bg-muted/50 rounded px-2 py-1 text-muted-foreground">
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function NodesDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("nodes"); }, [markPage]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Node Types</h1>
        <p className="text-muted-foreground mt-1">
          Every node receives output from its parent via <code className="bg-muted px-1 rounded">previousStep</code>.
          Expand any node to see its settings and examples.
        </p>
      </div>

      <div className="space-y-2">
        {NODE_DOCS.map((doc) => (
          <NodeDocCard key={doc.title} doc={doc} />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border/60 p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          <strong>Template variables:</strong> Most fields support <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> syntax.
          Reference data from previous steps with <code className="bg-muted px-1 rounded">previousStep.fieldName</code>.
        </p>
        <Link href="/docs/workflow" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Back to Interactive Workflow
          <ArrowRight className="h-3 w-3 rotate-180" />
        </Link>
      </div>
    </div>
  );
}
