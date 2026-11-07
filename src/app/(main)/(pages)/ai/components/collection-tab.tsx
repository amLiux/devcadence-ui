"use client";

import React from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemList } from "@/app/(main)/(pages)/ai/components/item-list";
import type { AiCollection } from "@/hooks/use-ai-collection";
import type { NamedItem } from "@/lib/types";

export function CollectionTab<T extends NamedItem>({
  title,
  collection,
  form,
}: {
  title: string;
  collection: AiCollection<T>;
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
