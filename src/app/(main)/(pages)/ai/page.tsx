"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import type { Connection } from "@/lib/types";

interface AIPersona {
  id: string;
  name: string;
  systemPrompt: string;
  tone: string;
  description: string;
}

interface AIPrompt {
  id: string;
  name: string;
  template: string;
  description: string;
}

interface AIContent {
  id: string;
  name: string;
  content: string;
  description: string;
}

function ItemList<T extends { id: string; name: string; description: string }>({
  items,
  selected,
  onSelect,
  onDelete,
}: {
  items: T[];
  selected: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">No items yet. Create one!</p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
            selected === item.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"
          }`}
          onClick={() => onSelect(item.id)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.description && (
              <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
            )}
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function PersonaForm({
  persona,
  onChange,
}: {
  persona: Partial<AIPersona>;
  onChange: (data: Partial<AIPersona>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Code Reviewer"
          value={persona.name || ""}
          onChange={(e) => onChange({ ...persona, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">System Prompt</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder="You are a senior code reviewer. Focus on security, performance, and maintainability..."
          value={persona.systemPrompt || ""}
          onChange={(e) => onChange({ ...persona, systemPrompt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tone (optional)</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Professional, concise, constructive"
          value={persona.tone || ""}
          onChange={(e) => onChange({ ...persona, tone: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder="What this persona is for"
          value={persona.description || ""}
          onChange={(e) => onChange({ ...persona, description: e.target.value })}
        />
      </div>
    </div>
  );
}

function PromptForm({
  prompt,
  onChange,
}: {
  prompt: Partial<AIPrompt>;
  onChange: (data: Partial<AIPrompt>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder="e.g. Summarize Issue"
          value={prompt.name || ""}
          onChange={(e) => onChange({ ...prompt, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Template</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder='Summarize the following issue:\n\n{{previousStep.content}}\n\nProvide a brief, actionable summary.'
          value={prompt.template || ""}
          onChange={(e) => onChange({ ...prompt, template: e.target.value })}
        />
        <p className="text-[10px] text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">{"{{variable}}"}</code> for dynamic values.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder="What this prompt does"
          value={prompt.description || ""}
          onChange={(e) => onChange({ ...prompt, description: e.target.value })}
        />
      </div>
    </div>
  );
}

function ContentForm({
  item,
  onChange,
  label,
}: {
  item: Partial<AIContent>;
  onChange: (data: Partial<AIContent>) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          className="h-8 text-xs"
          placeholder={`e.g. ${label} 1`}
          value={item.name || ""}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Content</Label>
        <Textarea
          className="min-h-[120px] text-xs font-mono"
          placeholder={`Enter ${label.toLowerCase()} content...`}
          value={item.content || ""}
          onChange={(e) => onChange({ ...item, content: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          className="h-8 text-xs"
          placeholder={`What this ${label.toLowerCase()} contains`}
          value={item.description || ""}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function AIPage() {
  const { request } = useApi();
  const [hasAIConnection, setHasAIConnection] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [contexts, setContexts] = useState<AIContent[]>([]);
  const [memories, setMemories] = useState<AIContent[]>([]);

  // Selection
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);

  // Check for AI connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connections = await request<Connection[]>({ endpoint: "/api/connections" });
        setHasAIConnection(connections?.some((c) => c.type === "AI") ?? false);
      } catch {
        setHasAIConnection(false);
      } finally {
        setLoading(false);
      }
    };
    checkConnection();
  }, [request]);

  // Load all data
  useEffect(() => {
    if (!hasAIConnection) return;
    const loadAll = async () => {
      const [p, pr, c, m] = await Promise.all([
        request<AIPersona[]>({ endpoint: "/api/ai/personas" }),
        request<AIPrompt[]>({ endpoint: "/api/ai/prompts" }),
        request<AIContent[]>({ endpoint: "/api/ai/context" }),
        request<AIContent[]>({ endpoint: "/api/ai/memory" }),
      ]);
      setPersonas(p ?? []);
      setPrompts(pr ?? []);
      setContexts(c ?? []);
      setMemories(m ?? []);
    };
    loadAll();
  }, [hasAIConnection, request]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!hasAIConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">AI Not Configured</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Add an AI connection in Settings to unlock Personas, Prompts, Context, and Memory.
          </p>
        </div>
        <Button variant="outline">
          <a href="/connections">Add AI Connection</a>
        </Button>
      </div>
    );
  }

  const handleSavePersona = async (data: Partial<AIPersona>) => {
    if (data.id) {
      await request({ endpoint: `/api/ai/personas/${data.id}`, method: "PUT", data });
    } else {
      const created = await request<AIPersona>({ endpoint: "/api/ai/personas", method: "POST", data });
      if (created) setPersonas((prev) => [created, ...prev]);
    }
  };

  const handleSavePrompt = async (data: Partial<AIPrompt>) => {
    if (data.id) {
      await request({ endpoint: `/api/ai/prompts/${data.id}`, method: "PUT", data });
    } else {
      const created = await request<AIPrompt>({ endpoint: "/api/ai/prompts", method: "POST", data });
      if (created) setPrompts((prev) => [created, ...prev]);
    }
  };

  const handleSaveContext = async (data: Partial<AIContent>) => {
    if (data.id) {
      await request({ endpoint: `/api/ai/context/${data.id}`, method: "PUT", data });
    } else {
      const created = await request<AIContent>({ endpoint: "/api/ai/context", method: "POST", data });
      if (created) setContexts((prev) => [created, ...prev]);
    }
  };

  const handleSaveMemory = async (data: Partial<AIContent>) => {
    if (data.id) {
      await request({ endpoint: `/api/ai/memory/${data.id}`, method: "PUT", data });
    } else {
      const created = await request<AIContent>({ endpoint: "/api/ai/memory", method: "POST", data });
      if (created) setMemories((prev) => [created, ...prev]);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    await request({ endpoint: `/api/ai/${type}/${id}`, method: "DELETE" });
    if (type === "personas") setPersonas((prev) => prev.filter((p) => p.id !== id));
    if (type === "prompts") setPrompts((prev) => prev.filter((p) => p.id !== id));
    if (type === "context") setContexts((prev) => prev.filter((c) => c.id !== id));
    if (type === "memory") setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI
        </h1>
        <p className="text-sm text-muted-foreground">Manage personas, prompts, context, and memory for your AI workflows.</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="personas" className="h-full">
          <TabsList>
            <TabsTrigger value="personas">Personas</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="mt-4">
            <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
              <div className="col-span-1 border rounded-lg p-3 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Personas</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPersona(null)}>
                    <Plus className="h-3 w-3 mr-1" /> New
                  </Button>
                </div>
                <ItemList items={personas} selected={selectedPersona} onSelect={setSelectedPersona} onDelete={(id) => handleDelete("personas", id)} />
              </div>
              <div className="col-span-2 border rounded-lg p-4 overflow-auto">
                <PersonaForm
                  persona={personas.find((p) => p.id === selectedPersona) || {}}
                  onChange={handleSavePersona}
                />
                <Button size="sm" className="mt-4" onClick={() => {
                  const persona = personas.find((p) => p.id === selectedPersona);
                  if (persona) handleSavePersona(persona);
                }}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="mt-4">
            <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
              <div className="col-span-1 border rounded-lg p-3 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Prompts</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPrompt(null)}>
                    <Plus className="h-3 w-3 mr-1" /> New
                  </Button>
                </div>
                <ItemList items={prompts} selected={selectedPrompt} onSelect={setSelectedPrompt} onDelete={(id) => handleDelete("prompts", id)} />
              </div>
              <div className="col-span-2 border rounded-lg p-4 overflow-auto">
                <PromptForm
                  prompt={prompts.find((p) => p.id === selectedPrompt) || {}}
                  onChange={handleSavePrompt}
                />
                <Button size="sm" className="mt-4" onClick={() => {
                  const prompt = prompts.find((p) => p.id === selectedPrompt);
                  if (prompt) handleSavePrompt(prompt);
                }}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
              <div className="col-span-1 border rounded-lg p-3 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Context</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedContext(null)}>
                    <Plus className="h-3 w-3 mr-1" /> New
                  </Button>
                </div>
                <ItemList items={contexts} selected={selectedContext} onSelect={setSelectedContext} onDelete={(id) => handleDelete("context", id)} />
              </div>
              <div className="col-span-2 border rounded-lg p-4 overflow-auto">
                <ContentForm
                  item={contexts.find((c) => c.id === selectedContext) || {}}
                  onChange={handleSaveContext}
                  label="Context"
                />
                <Button size="sm" className="mt-4" onClick={() => {
                  const ctx = contexts.find((c) => c.id === selectedContext);
                  if (ctx) handleSaveContext(ctx);
                }}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="mt-4">
            <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
              <div className="col-span-1 border rounded-lg p-3 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Memory</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMemory(null)}>
                    <Plus className="h-3 w-3 mr-1" /> New
                  </Button>
                </div>
                <ItemList items={memories} selected={selectedMemory} onSelect={setSelectedMemory} onDelete={(id) => handleDelete("memory", id)} />
              </div>
              <div className="col-span-2 border rounded-lg p-4 overflow-auto">
                <ContentForm
                  item={memories.find((m) => m.id === selectedMemory) || {}}
                  onChange={handleSaveMemory}
                  label="Memory"
                />
                <Button size="sm" className="mt-4" onClick={() => {
                  const mem = memories.find((m) => m.id === selectedMemory);
                  if (mem) handleSaveMemory(mem);
                }}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}