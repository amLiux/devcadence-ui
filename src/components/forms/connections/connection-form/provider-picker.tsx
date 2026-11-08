"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectionIcons, integrationConfigs } from "@/lib/constants";
import type { ConnectionType } from "@/lib/types";

export function ProviderPicker({
  pagedTypes,
  emptySlots,
  totalPages,
  page,
  onPageChange,
  selectedType,
  onSelect,
}: {
  pagedTypes: ConnectionType[];
  emptySlots: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  selectedType: ConnectionType | "";
  onSelect: (type: ConnectionType) => void;
}) {
  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="grid grid-cols-3 gap-1 grid-rows-3">
        {pagedTypes.map((type) => {
          const config = integrationConfigs[type];
          return (
            <button
              key={type}
              type="button"
              className={`text-left px-2 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                selectedType === type
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              } ${config.comingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => {
                if (config.comingSoon) return;
                onSelect(type);
              }}
            >
              <div className="h-6 w-6 flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src={connectionIcons[type]}
                  alt={type}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-xs">{type}</span>
              {config.comingSoon && (
                <span className="text-[9px] text-muted-foreground ml-auto">Soon</span>
              )}
            </button>
          );
        })}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1}/{totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={page === totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
