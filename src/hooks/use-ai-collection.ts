"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useApi } from "@/hooks/use-api";
import type { NamedItem } from "@/lib/types";

export interface AiCollection<T extends NamedItem> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  selected: string | null;
  draft: Partial<T>;
  setDraft: Dispatch<SetStateAction<Partial<T>>>;
  select: (id: string | null) => void;
  submit: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * CRUD state for one AI collection (personas, prompts, context, memory).
 * Owns the list, the current selection and the draft, so pages never repeat
 * the trim-check / PUT-merge / POST-prepend dance.
 */
export function useAiCollection<T extends NamedItem>(endpoint: string, requiredKey: keyof T): AiCollection<T> {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<T>>({});

  const select = (id: string | null) => {
    setSelected(id);
    setDraft(id ? (items.find((item) => item.id === id) ?? {}) : {});
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
