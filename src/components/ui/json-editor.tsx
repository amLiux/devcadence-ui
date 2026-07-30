"use client";

import React, { useEffect, useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  error?: string | null;
}

export function JsonEditor({ value, onChange, placeholder, minHeight = 80, error }: JsonEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const highlight = (code: string) => {
    if (!mounted) return code;
    return Prism.highlight(code, Prism.languages.json, "json");
  };

  return (
    <div className="space-y-1">
      <div
        className={`rounded-md border bg-muted/30 font-mono text-xs overflow-hidden ${error ? "border-red-500" : "border-input"}`}
        style={{ minHeight }}
      >
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={highlight}
          padding={12}
          className="font-mono text-xs"
          textareaClassName="focus:outline-none"
          placeholder={placeholder}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minHeight,
          }}
        />
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

export function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function validateJson(value: string): string | null {
  if (!value.trim()) return null;
  try {
    JSON.parse(value);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid JSON";
  }
}
