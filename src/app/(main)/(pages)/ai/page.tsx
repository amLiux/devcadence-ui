"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { useAiCollection } from "@/hooks/use-ai-collection";
import { CollectionTab } from "@/app/(main)/(pages)/ai/components/collection-tab";
import { ContentForm } from "@/app/(main)/(pages)/ai/components/content-form";
import { PersonaForm } from "@/app/(main)/(pages)/ai/components/persona-form";
import { PromptForm } from "@/app/(main)/(pages)/ai/components/prompt-form";
import type { AIContent, AIPersona, AIPrompt, Connection } from "@/lib/types";

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
