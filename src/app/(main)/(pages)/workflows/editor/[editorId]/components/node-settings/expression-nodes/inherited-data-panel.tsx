"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function InheritedDataPanel({ output }: { output: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Inherited Data
      </button>
      {open && (
        <div className="px-3 pb-3">
          {output ? (
            <pre className="max-h-[120px] overflow-auto text-[10px] font-mono bg-muted p-2 rounded">
              {JSON.stringify(output, null, 2)}
            </pre>
          ) : (
            <p className="text-[10px] text-muted-foreground">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}
