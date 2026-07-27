"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ChevronLeft, Zap, Globe, Plug, Database, Sparkles, Mail, Terminal, GitBranch, Lock, ArrowDown, Check } from "lucide-react";
import { useDocsProgress } from "@/hooks/use-tutorial-progress";
import { integrationConfigs, connectionIcons } from "@/lib/constants";
import type { ConnectionType } from "@/lib/types";

// ── Node visual metadata ─────────────────────────────────────────────

interface NodeVisual {
  name: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bg: string;
  description: string;
}

const NODE_VISUALS: Record<string, NodeVisual> = {
  "Create Issue": { name: "Create Issue", icon: <GitBranch className="h-4 w-4" />, color: "text-foreground", borderColor: "border-foreground/30", bg: "bg-foreground/5", description: "Create GitHub issues with title, body, labels, assignees" },
  "Add Comment": { name: "Add Comment", icon: <GitBranch className="h-4 w-4" />, color: "text-foreground", borderColor: "border-foreground/30", bg: "bg-foreground/5", description: "Post comments on issues and PRs" },
  "Add Label": { name: "Add Label", icon: <GitBranch className="h-4 w-4" />, color: "text-foreground", borderColor: "border-foreground/30", bg: "bg-foreground/5", description: "Label issues and PRs for organization" },
  "Request Review": { name: "Request Review", icon: <GitBranch className="h-4 w-4" />, color: "text-foreground", borderColor: "border-foreground/30", bg: "bg-foreground/5", description: "Request PR reviews from team members" },
  "Listen Commits": { name: "Listen Commits", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Trigger on new commits to any branch" },
  "Listen PRs": { name: "Listen PRs", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Trigger on PR opened, updated, or merged" },
  "Listen Issues": { name: "Listen Issues", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Trigger on issue created or updated" },
  "Listen Comments": { name: "Listen Comments", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Trigger on new comments on issues/PRs" },
  "Listen Releases": { name: "Listen Releases", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Trigger on new releases published" },
  "PostgreSQL Query": { name: "Query", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "SELECT with parameterized queries" },
  "PostgreSQL Insert": { name: "Insert", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "INSERT with column/value mapping" },
  "PostgreSQL Update": { name: "Update", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "UPDATE with SET and WHERE clauses" },
  "PostgreSQL Delete": { name: "Delete", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "DELETE with WHERE clause" },
  "Webhook Trigger": { name: "Webhook Trigger", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500", borderColor: "border-yellow-500/30", bg: "bg-yellow-500/5", description: "Receive HTTP webhooks with optional HMAC verification" },
  "Prompt": { name: "Prompt", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-500", borderColor: "border-purple-500/30", bg: "bg-purple-500/5", description: "Send prompts to AI with persona, context, memory" },
  "Classify": { name: "Classify", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-500", borderColor: "border-purple-500/30", bg: "bg-purple-500/5", description: "Classify text into categories" },
  "Extract": { name: "Extract", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-500", borderColor: "border-purple-500/30", bg: "bg-purple-500/5", description: "Extract structured data as JSON" },
  "Execute Command": { name: "Execute Command", icon: <Terminal className="h-4 w-4" />, color: "text-blue-500", borderColor: "border-blue-500/30", bg: "bg-blue-500/5", description: "Run shell commands on remote servers" },
  "Send Email": { name: "Send Email", icon: <Mail className="h-4 w-4" />, color: "text-red-500", borderColor: "border-red-500/30", bg: "bg-red-500/5", description: "Send emails with HTML, templates, attachments" },
  "Send Message": { name: "Send Message", icon: <Mail className="h-4 w-4" />, color: "text-blue-500", borderColor: "border-blue-500/30", bg: "bg-blue-500/5", description: "Send messages to channels" },
  "Query Database": { name: "Query Database", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "Read from databases" },
  "Create Page": { name: "Create Page", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "Create new pages" },
  "Upload File": { name: "Upload File", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "Upload files to storage" },
  "List Files": { name: "List Files", icon: <Database className="h-4 w-4" />, color: "text-green-500", borderColor: "border-green-500/30", bg: "bg-green-500/5", description: "List files in storage" },
};

// ── Connection type list item ────────────────────────────────────────

function ConnectionListItem({ type, config, isSelected, onClick }: {
  type: ConnectionType;
  config: (typeof integrationConfigs)[ConnectionType];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
        isSelected
          ? "bg-primary/10 border border-primary/30 shadow-sm"
          : "border border-transparent hover:bg-muted/50 hover:border-border"
      }`}
    >
      <div className="h-9 w-9 flex items-center justify-center overflow-hidden shrink-0 rounded-md bg-background border border-border/50">
        <Image src={connectionIcons[type]} alt={type} width={24} height={24} className="object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{type}</div>
        <div className="text-[10px] text-muted-foreground truncate">{config.features?.length ?? 0} nodes</div>
      </div>
      {config.comingSoon && (
        <Badge variant="secondary" className="text-[9px] shrink-0">Soon</Badge>
      )}
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}

// ── Simulated form ───────────────────────────────────────────────────

function SimulatedForm({ type, config }: { type: ConnectionType; config: (typeof integrationConfigs)[ConnectionType] }) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Name</Label>
        <Input className="h-8 text-xs" placeholder={`My ${type} Connection`} value={values.name || ""} onChange={(e) => setValues({ ...values, name: e.target.value })} />
      </div>
      {config.inputs.map((input) => (
        <div key={input.key} className="space-y-2">
          <Label className="text-xs">{input.label}</Label>
          {input.type === "select" && input.options ? (
            <Select value={values[input.key] || ""} onValueChange={(v) => setValues({ ...values, [input.key]: v ?? "" })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {input.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 text-xs"
              type={input.type}
              placeholder={input.type === "password" ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : input.defaultValue || input.label}
              value={values[input.key] || input.defaultValue || ""}
              onChange={(e) => setValues({ ...values, [input.key]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Node preview card (matches real EditorCanvasCard) ─────────────────

function NodePreview({ feature, index }: { feature: string; index: number }) {
  const visual = NODE_VISUALS[feature] || { name: feature, icon: <Plug className="h-4 w-4" />, color: "text-muted-foreground", borderColor: "border-border", bg: "bg-muted/50", description: "" };

  return (
    <div
      className={`animate-in slide-in-from-bottom-2`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`rounded-lg border ${visual.borderColor} bg-background p-3 shadow-sm w-full transition-all duration-200 hover:shadow-md`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className={visual.color}>{visual.icon}</div>
            <span className="font-medium text-sm truncate">{visual.name}</span>
          </div>
        </div>
        {visual.description && (
          <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{visual.description}</p>
        )}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">{visual.name.split(" ").pop()}</Badge>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function ConnectionsDocsPage() {
  const { markPage } = useDocsProgress();
  useEffect(() => { markPage("connections"); }, [markPage]);

  const [selected, setSelected] = useState<ConnectionType | null>(null);
  const activeTypes = Object.entries(integrationConfigs).filter(([, c]) => !c.comingSoon) as [ConnectionType, (typeof integrationConfigs)[ConnectionType]][];
  const comingSoonTypes = Object.entries(integrationConfigs).filter(([, c]) => c.comingSoon) as [ConnectionType, (typeof integrationConfigs)[ConnectionType]][];

  const selectedConfig = selected ? integrationConfigs[selected] : null;

  return (
    <div className="p-6 h-full max-w-full">
      <div className="max-w-3xl mb-6">
        <Link href="/docs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="h-3 w-3" />
          Back to docs
        </Link>
        <h1 className="text-2xl font-bold">Connections & Triggers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a connection to see how to configure it and which nodes it unlocks.
        </p>
      </div>

      {/* Split panel */}
      <div className="flex gap-6 min-h-[500px]">
        {/* Left: connection list */}
        <div className="w-[240px] shrink-0 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Available</div>
          {activeTypes.map(([type, config]) => (
            <ConnectionListItem
              key={type}
              type={type}
              config={config}
              isSelected={selected === type}
              onClick={() => setSelected(selected === type ? null : type)}
            />
          ))}
          {comingSoonTypes.length > 0 && (
            <>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 mt-4 mb-2">Coming Soon</div>
              {comingSoonTypes.map(([type, config]) => (
                <ConnectionListItem
                  key={type}
                  type={type}
                  config={config}
                  isSelected={selected === type}
                  onClick={() => setSelected(selected === type ? null : type)}
                />
              ))}
            </>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 min-w-0">
          {selected && selectedConfig ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 flex items-center justify-center overflow-hidden rounded-xl bg-background border border-border shadow-sm">
                  <Image src={connectionIcons[selected]} alt={selected} width={40} height={40} className="object-contain" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selected}</h2>
                  <p className="text-sm text-muted-foreground">{selectedConfig.description}</p>
                </div>
              </div>

              {/* Two columns: form + nodes */}
              <div className="grid grid-cols-2 gap-6">
                {/* Configuration form */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Configuration
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <SimulatedForm type={selected} config={selectedConfig} />
                  </div>
                </div>

                {/* Node previews */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Unlocked Nodes
                  </div>
                  <div className="space-y-2">
                    {selectedConfig.features?.map((feature, i) => (
                      <NodePreview key={feature} feature={feature} index={i} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Flow hint */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-border/60">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  After creating this connection, drag any of these nodes into your workflow.
                  The node will use this connection&apos;s credentials automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Plug className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Select a connection to explore</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-border/60 p-4 space-y-2">
        <Link href="/docs/nodes" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Next: Node Types
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
