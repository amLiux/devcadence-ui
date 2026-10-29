"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Globe,
  Sparkles,
  GitBranch,
  Database,
  Zap,
  Mail,
  Terminal,
  ArrowRightLeft,
  LogIn,
  LogOut,
  RotateCcw,
  Shield,
  Calendar,
  MessageSquare,
  Tag,
  UserPlus,
  MessageCircle,
  Send,
  Inbox,
  Bot,
  Code2,
  Search,
  X,
} from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";

type NodeCategory = "Triggers" | "Actions" | "Security";
type NodeProvider = "None" | "GitHub" | "PostgreSQL" | "AI" | "SMTP" | "Discord" | "Webhook" | "Sub-workflow" | "Security";

interface NodeDoc {
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  requires: string;
  settings: { key: string; desc: string }[];
  examples: string[];
  category: NodeCategory;
  provider: NodeProvider;
}

const NODE_DOCS: NodeDoc[] = [
  // Triggers
  {
    title: "Schedule",
    icon: <Calendar className="h-4 w-4 text-orange-500" />,
    color: "border-orange-500/30",
    description: "Starts a workflow on a cron schedule. Use it to run scans, reports, or cleanups periodically.",
    requires: "None",
    settings: [
      { key: "cron", desc: "Cron expression, e.g. 0 9 * * 1 for Mondays at 9am." },
    ],
    examples: ["0 * * * * — every hour", "0 9 * * 1 — every Monday morning"],
    category: "Triggers",
    provider: "None",
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
    examples: ["POST to /api/webhooks/:connectionId with JSON body"],
    category: "Triggers",
    provider: "Webhook",
  },
  {
    title: "Listen Commits",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Trigger on new pushes to a GitHub repository.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "branch", desc: "Branch filter (optional)." },
    ],
    examples: ["Trigger on every push to main"],
    category: "Triggers",
    provider: "GitHub",
  },
  {
    title: "Listen Pull Requests",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Trigger on PR events: open, close, merge, review.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "events", desc: "Comma-separated: opened, closed, merged, review_requested." },
    ],
    examples: ["Auto-assign reviewer on new PR"],
    category: "Triggers",
    provider: "GitHub",
  },
  {
    title: "Listen Issues",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Trigger on issue events: open, close, label.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "events", desc: "Comma-separated: opened, closed, labeled, assigned." },
    ],
    examples: ["Add comment when issue is labeled bug"],
    category: "Triggers",
    provider: "GitHub",
  },
  {
    title: "Listen Comments",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Trigger on new comments on issues or pull requests.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
    ],
    examples: ["Notify Slack on new issue comment"],
    category: "Triggers",
    provider: "GitHub",
  },
  {
    title: "Listen Releases",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Trigger when a release is published on GitHub.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
    ],
    examples: ["Announce release on Discord"],
    category: "Triggers",
    provider: "GitHub",
  },
  {
    title: "Listen Discord Messages",
    icon: <MessageCircle className="h-4 w-4 text-indigo-500" />,
    color: "border-indigo-500/30",
    description: "Trigger on new messages in a Discord channel.",
    requires: "Discord connection",
    settings: [
      { key: "channelId", desc: "Discord channel ID to listen to." },
      { key: "filter", desc: "Optional keyword or regex filter." },
    ],
    examples: ["React to support messages in #help"],
    category: "Triggers",
    provider: "Discord",
  },
  {
    title: "Input",
    icon: <LogIn className="h-4 w-4 text-cyan-500" />,
    color: "border-cyan-500/30",
    description: "Receives data from a parent workflow's Call Workflow node. Only used in sub-workflows.",
    requires: "Sub-workflow (marked as 'Reusable')",
    settings: [
      { key: "input_1", desc: "Field name — accessed as {{input.fieldName}}" },
      { key: "input_2", desc: "Optional second field" },
      { key: "input_3", desc: "Optional third field" },
    ],
    examples: [
      "input_1: data — accessed as {{input.data}}",
      "input_1: token, input_2: userId — accessed as {{input.token}}, {{input.userId}}",
    ],
    category: "Triggers",
    provider: "Sub-workflow",
  },
  // Actions
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
    category: "Actions",
    provider: "None",
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
    category: "Actions",
    provider: "None",
  },
  {
    title: "Build JSON",
    icon: <Code2 className="h-4 w-4 text-slate-500" />,
    color: "border-slate-500/30",
    description: "Builds a JSON object from key-value fields. Useful for constructing payloads for HTTP or AI nodes.",
    requires: "None",
    settings: [
      { key: "fields", desc: "JSON object where values support {{expression}}." },
    ],
    examples: [
      '{"userId": "{{previousStep.userId}}", "status": "active"}',
    ],
    category: "Actions",
    provider: "None",
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
    category: "Actions",
    provider: "None",
  },
  {
    title: "Retry Loop",
    icon: <RotateCcw className="h-4 w-4 text-orange-500" />,
    color: "border-orange-500/30",
    description: "Makes an HTTP request and retries until a condition is met or max attempts exhausted. Poll APIs, wait for async jobs, or retry flaky endpoints.",
    requires: "None",
    settings: [
      { key: "url", desc: "Request URL. Supports {{expression}} template variables." },
      { key: "method", desc: "GET, POST, PUT, PATCH, DELETE." },
      { key: "headers", desc: "JSON object for auth tokens, content types, etc." },
      { key: "body", desc: "JSON payload for POST/PUT/PATCH." },
      { key: "maxRetries", desc: "Max attempts (1–10). Default: 3." },
      { key: "delay", desc: "Seconds between retries (1–30). Default: 2." },
      { key: "condition", desc: "Expression that must be true to stop. Use response.status and response.body." },
      { key: "onFailure", desc: "What to do after all retries fail: 'error' (fail workflow) or 'skip' (return last response)." },
    ],
    examples: [
      "Poll: GET https://api.example.com/status/{{previousStep.jobId}} — condition: response.body.done === true",
      "Wait for deploy: condition: response.status === 200 && response.body.status === 'active'",
      "Retry on 429: condition: response.status !== 429 (keep retrying while rate-limited)",
    ],
    category: "Actions",
    provider: "None",
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
    category: "Actions",
    provider: "AI",
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
    examples: ["Categories: bug, feature, question — Classify: {{previousStep.issue.body}}"],
    category: "Actions",
    provider: "AI",
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
    examples: ["Fields: name, email, priority — Extract from: {{previousStep.content}}"],
    category: "Actions",
    provider: "AI",
  },
  {
    title: "PostgreSQL Query",
    icon: <Database className="h-4 w-4 text-green-500" />,
    color: "border-green-500/30",
    description: "Execute a SELECT query against a PostgreSQL database using parameterized queries.",
    requires: "PostgreSQL connection",
    settings: [
      { key: "connectionId", desc: "PostgreSQL connection to use." },
      { key: "sql", desc: "SELECT query. Supports {{expression}} in parameters only." },
    ],
    examples: ["SELECT * FROM users WHERE id = {{previousStep.userId}}"],
    category: "Actions",
    provider: "PostgreSQL",
  },
  {
    title: "PostgreSQL Insert",
    icon: <Database className="h-4 w-4 text-green-500" />,
    color: "border-green-500/30",
    description: "Insert a row into a PostgreSQL table.",
    requires: "PostgreSQL connection",
    settings: [
      { key: "connectionId", desc: "PostgreSQL connection to use." },
      { key: "table", desc: "Target table name." },
      { key: "columns", desc: "Comma-separated column names." },
      { key: "values", desc: "Comma-separated values. Supports {{expression}}." },
    ],
    examples: ["INSERT name, email VALUES {{previousStep.name}}, {{previousStep.email}}"],
    category: "Actions",
    provider: "PostgreSQL",
  },
  {
    title: "PostgreSQL Update",
    icon: <Database className="h-4 w-4 text-green-500" />,
    color: "border-green-500/30",
    description: "Update rows in a PostgreSQL table.",
    requires: "PostgreSQL connection",
    settings: [
      { key: "connectionId", desc: "PostgreSQL connection to use." },
      { key: "table", desc: "Target table name." },
      { key: "setClause", desc: "SET expression. Supports {{expression}}." },
      { key: "whereClause", desc: "WHERE clause. Supports {{expression}}." },
    ],
    examples: ["UPDATE users SET status = 'active' WHERE id = {{previousStep.userId}}"],
    category: "Actions",
    provider: "PostgreSQL",
  },
  {
    title: "PostgreSQL Delete",
    icon: <Database className="h-4 w-4 text-green-500" />,
    color: "border-green-500/30",
    description: "Delete rows from a PostgreSQL table.",
    requires: "PostgreSQL connection",
    settings: [
      { key: "connectionId", desc: "PostgreSQL connection to use." },
      { key: "table", desc: "Target table name." },
      { key: "whereClause", desc: "WHERE clause. Empty = delete all rows." },
    ],
    examples: ["DELETE FROM users WHERE id = {{previousStep.userId}}"],
    category: "Actions",
    provider: "PostgreSQL",
  },
  {
    title: "Create Issue",
    icon: <GitBranch className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Create a new GitHub issue with title, body, labels, and assignees.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "title", desc: "Issue title. Supports {{expression}}." },
      { key: "body", desc: "Issue body. Supports {{expression}}." },
      { key: "labels", desc: "Comma-separated labels." },
      { key: "assignees", desc: "Comma-separated GitHub usernames." },
    ],
    examples: ["Create bug issue when previousStep.classification === 'bug'"],
    category: "Actions",
    provider: "GitHub",
  },
  {
    title: "Add Comment",
    icon: <MessageSquare className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Post a comment on a GitHub issue or pull request.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "issueNumber", desc: "Issue or PR number." },
      { key: "body", desc: "Comment body. Supports {{expression}}." },
    ],
    examples: ["Comment 'acknowledged' on new issue"],
    category: "Actions",
    provider: "GitHub",
  },
  {
    title: "Add Label",
    icon: <Tag className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Add a label to a GitHub issue or pull request.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "issueNumber", desc: "Issue or PR number." },
      { key: "label", desc: "Label name." },
    ],
    examples: ["Add 'bug' label when classification is bug"],
    category: "Actions",
    provider: "GitHub",
  },
  {
    title: "Request Review",
    icon: <UserPlus className="h-4 w-4 text-foreground" />,
    color: "border-foreground/30",
    description: "Request a review from one or more users on a pull request.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "pullNumber", desc: "Pull request number." },
      { key: "reviewers", desc: "Comma-separated GitHub usernames." },
    ],
    examples: ["Request review from team-lead on new PR"],
    category: "Actions",
    provider: "GitHub",
  },
  {
    title: "Send Email",
    icon: <Mail className="h-4 w-4 text-red-500" />,
    color: "border-red-500/30",
    description: "Send an email via SMTP.",
    requires: "SMTP connection",
    settings: [
      { key: "connectionId", desc: "SMTP connection to use." },
      { key: "to", desc: "Recipient email address." },
      { key: "subject", desc: "Email subject. Supports {{expression}}." },
      { key: "body", desc: "Email body. Supports {{expression}}." },
    ],
    examples: ["Send daily report to ops@example.com"],
    category: "Actions",
    provider: "SMTP",
  },
  {
    title: "Send Discord Message",
    icon: <Send className="h-4 w-4 text-indigo-500" />,
    color: "border-indigo-500/30",
    description: "Send a message to a Discord channel.",
    requires: "Discord connection",
    settings: [
      { key: "connectionId", desc: "Discord connection to use." },
      { key: "channelId", desc: "Discord channel ID." },
      { key: "content", desc: "Message content. Supports {{expression}}." },
    ],
    examples: ["Notify #deployments when release is published"],
    category: "Actions",
    provider: "Discord",
  },
  {
    title: "Read Discord Messages",
    icon: <Inbox className="h-4 w-4 text-indigo-500" />,
    color: "border-indigo-500/30",
    description: "Fetch recent messages from a Discord channel.",
    requires: "Discord connection",
    settings: [
      { key: "connectionId", desc: "Discord connection to use." },
      { key: "channelId", desc: "Discord channel ID." },
      { key: "limit", desc: "Number of messages to fetch (max 100)." },
    ],
    examples: ["Read last 50 messages from #support"],
    category: "Actions",
    provider: "Discord",
  },
  {
    title: "Send Direct Message",
    icon: <Bot className="h-4 w-4 text-indigo-500" />,
    color: "border-indigo-500/30",
    description: "Send a DM to a Discord user.",
    requires: "Discord connection",
    settings: [
      { key: "connectionId", desc: "Discord connection to use." },
      { key: "userId", desc: "Discord user ID." },
      { key: "content", desc: "Message content. Supports {{expression}}." },
    ],
    examples: ["DM on-call engineer when critical alert fires"],
    category: "Actions",
    provider: "Discord",
  },
  {
    title: "Call Workflow",
    icon: <ArrowRightLeft className="h-4 w-4 text-emerald-500" />,
    color: "border-emerald-500/30",
    description: "Calls a reusable sub-workflow. Pass input, get output. Synchronous execution.",
    requires: "At least one workflow marked as 'Reusable'",
    settings: [
      { key: "workflowId", desc: "Select a reusable workflow from the dropdown." },
      { key: "input", desc: "JSON object passed to the sub-workflow's Input node." },
    ],
    examples: [
      '{"credentials": "{{webhook.body.credentials}}"}',
      '{"userId": "{{previousStep.userId}}", "apiKey": "{{previousStep.apiKey}}"}',
    ],
    category: "Actions",
    provider: "Sub-workflow",
  },
  {
    title: "Return",
    icon: <LogOut className="h-4 w-4 text-amber-500" />,
    color: "border-amber-500/30",
    description: "Exports values back to the parent workflow. Only used in sub-workflows.",
    requires: "Sub-workflow (marked as 'Reusable')",
    settings: [
      { key: "return_name_1", desc: "Export name — parent accesses as {{callWorkflow.name}}" },
      { key: "return_value_1", desc: "Value to export (supports {{expression}})" },
      { key: "return_name_2", desc: "Optional second export" },
      { key: "return_value_2", desc: "Optional second value" },
    ],
    examples: [
      "name: token, value: {{http.response.access_token}}",
      "name: result, value: {{previousStep}}",
    ],
    category: "Actions",
    provider: "Sub-workflow",
  },
  // Security
  {
    title: "Scan Dependencies",
    icon: <Shield className="h-4 w-4 text-emerald-500" />,
    color: "border-emerald-500/30",
    description: "Scans a repository manifest for known vulnerabilities using OSV or GitHub Advisory. Use with a Conditional node to open issues only when findings exist.",
    requires: "GitHub connection",
    settings: [
      { key: "repo", desc: "Repository in owner/name format." },
      { key: "branch", desc: "Branch to read the manifest from." },
      { key: "manifestPath", desc: "Path to manifest (package.json, requirements.txt, pyproject.toml)." },
      { key: "ecosystem", desc: "npm or python; auto-detected from manifest path." },
      { key: "provider", desc: "OSV (default) or GitHub Advisory." },
      { key: "severityFilter", desc: "Filter findings by minimum severity: all, low, moderate, high, critical." },
      { key: "outputName", desc: "Optional alias for the scan result output." },
    ],
    examples: [
      "Schedule → Scan Dependencies → Conditional (previousStep.hasFindings) → Create Issue",
      "Filter to high+ findings by setting severityFilter to high",
    ],
    category: "Security",
    provider: "Security",
  },
];

type ProviderFilter = NodeProvider | "All";

const PROVIDERS: ProviderFilter[] = ["All", "None", "GitHub", "PostgreSQL", "AI", "SMTP", "Discord", "Webhook", "Sub-workflow", "Security"];

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

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return NODE_DOCS.filter((doc) => {
      const matchesProvider = provider === "All" || doc.provider === provider;
      if (!q) return matchesProvider;
      const haystack = [
        doc.title,
        doc.description,
        doc.requires,
        ...doc.settings.map((s) => `${s.key} ${s.desc}`),
        ...doc.examples,
      ].join(" ").toLowerCase();
      return matchesProvider && haystack.includes(q);
    });
  }, [search, provider]);

  const grouped = useMemo(() => {
    const cats: NodeCategory[] = ["Triggers", "Actions", "Security"];
    return cats.map((cat) => ({
      category: cat,
      nodes: filtered.filter((d) => d.category === cat),
    })).filter((g) => g.nodes.length > 0);
  }, [filtered]);

  const counts = useMemo(() => {
    const total = NODE_DOCS.length;
    const shown = filtered.length;
    return { total, shown };
  }, [filtered]);

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

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search nodes, settings, examples..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <Button
              key={p}
              variant={provider === p ? "default" : "outline"}
              size="sm"
              onClick={() => setProvider(p)}
              className="h-7 text-[10px] px-2"
            >
              {p}
            </Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Showing {counts.shown} of {counts.total} nodes
        </p>
      </div>

      {/* Grouped node list */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.category} className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{group.category}</h2>
              <Badge variant="secondary" className="text-[9px]">{group.nodes.length}</Badge>
            </div>
            <div className="space-y-2">
              {group.nodes.map((doc) => (
                <NodeDocCard key={doc.title} doc={doc} />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">No nodes match your filters.</p>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setProvider("All"); }} className="mt-2 text-xs">
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border/60 p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          <strong>Template variables:</strong> Most fields support <code className="bg-muted px-1 rounded">{"{{expression}}"}</code> syntax.
          Reference data from previous steps with <code className="bg-muted px-1 rounded">previousStep.fieldName</code>.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <Link href="/docs/retry-loop" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ArrowRight className="h-3 w-3 rotate-180" />
          Previous: Retry Loops
        </Link>
        <Link href="/docs/connections" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Connections & Triggers
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
