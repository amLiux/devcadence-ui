"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";

export function useAIList<T extends { id: string; name: string }>(endpoint: string) {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    request<T[]>({ endpoint }).then((data) => {
      if (data) setItems(data);
    });
  }, [request, endpoint]);

  return items;
}
