"use client";

import { useCallback, useState } from "react";

interface ToastState {
  open: boolean;
  title: string;
  description: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ open: false, title: "", description: "" });

  const showToast = useCallback((options: { title: string; description?: string }) => {
    setToast({ open: true, title: options.title, description: options.description ?? "" });
    setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 3000);
  }, []);

  const dismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  return { toast, showToast, dismiss };
}
