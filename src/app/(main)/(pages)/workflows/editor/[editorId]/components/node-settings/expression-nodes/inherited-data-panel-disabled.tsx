"use client";

import { ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InheritedDataPanelDisabled() {
  return (
    <div className="border rounded-md opacity-50">
      <div className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium">
        <ChevronRight className="h-3 w-3" />
        Inherited Data
        <Tooltip>
          <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground ml-auto" />} />
          <TooltipContent>
            <p className="text-xs">Run this node&apos;s parent node to see available data</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
