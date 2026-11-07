"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import type { Connection } from "@/lib/types";

interface NamedItem {
  id: string;
  name: string;
  description: string;
}

interface AIPersona extends NamedItem {
  systemPrompt: string;
  tone: string;
}

interface AIPrompt extends NamedItem {
  template: string;
}

interface AIContent extends NamedItem {
  content: string;
}

function useAiCollection<T extends NamedItem>(endpoint: string, requiredKey: keyof T) {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});

  const select = (id: string | null) => {
    setSelected(id);
    setDraft(id ? items.find((item) => item.id === id) ?? {} : {});
  };

  const submit = async () => {
    const data = draft;
    const required = data[requiredKey];
    if (!data.name?.trim() || typeof required !== "string" || !required.trim()) return;

    if (data.id) {
      await request({ endpoint: `${endpoint}/${data.id}`, method: "PUT", data });
      setItems((prev) => prev.map((item) => (item.id === data.id ? ({ ...item, ...data } as T) : item)));
      return;
    }

    const created = await request<T>({ endpoint, method: "POST", data });
    if (!created) return;
    setItems((prev) => [created, ...prev]);
    setSelected(created.id);
    setDraft(created);
  };

  const remove = async (id: string) => {
    await request({ endpoint: `${endpoint}/${id}`, method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selected === id) {
      setSelected(null);
      setDraft({});
    }
  };

  return { items, setItems, selected, draft, setDraft, select, submit, remove };
}

function ItemList<T extends NamedItem>({
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

function CollectionTab<T extends NamedItem>({
  title,
  collection,
  form,
}: {
  title: string;
  collection: ReturnType<typeof useAiCollection<T>>;
  form: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
      <div className="col-span-1 border rounded-lg p-3 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <Button size="sm" variant="outline" onClick={() => collection.select(null)}>
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
        <ItemList
          items={collection.items}
          selected={collection.selected}
          onSelect={collection.select}
          onDelete={collection.remove}
        />
      </div>
      <div className="col-span-2 border rounded-lg p-4 overflow-auto">
        {form}
        <Button size="sm" className="mt-4" onClick={collection.submit}>
          <Save className="h-3 w-3 mr-1" /> Save
        </Button>
      </div>
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

  const personas = useAiCollection<AIPersona>("/api/ai/personas", "systemPrompt");
  const prompts = useAiCollection<AIPrompt>("/api/ai/prompts", "template");
  const contexts = useAiCollection<AIContent>("/api/ai/context", "content");
  const memories = useAiCollection<AIContent>("/api/ai/memory", "content");

  // Setters are stable, so the load effect can depend on them directly.
  const { setItems: setPersonas } = personas;
  const { setItems: setPrompts } = prompts;
  const { setItems: setContexts } = contexts;
  const { setItems: setMemories } = memories;

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
  }, [hasAIConnection, request, setPersonas, setPrompts, setContexts, setMemories]);

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
            <CollectionTab
              title="Personas"
              collection={personas}
              form={<PersonaForm persona={personas.draft} onChange={personas.setDraft} />}
            />
          </TabsContent>

          <TabsContent value="prompts" className="mt-4">
            <CollectionTab
              title="Prompts"
              collection={prompts}
              form={<PromptForm prompt={prompts.draft} onChange={prompts.setDraft} />}
            />
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <CollectionTab
              title="Context"
              collection={contexts}
              form={<ContentForm item={contexts.draft} onChange={contexts.setDraft} label="Context" />}
            />
          </TabsContent>

          <TabsContent value="memory" className="mt-4">
            <CollectionTab
              title="Memory"
              collection={memories}
              form={<ContentForm item={memories.draft} onChange={memories.setDraft} label="Memory" />}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
