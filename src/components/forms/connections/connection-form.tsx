"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { integrationConfigs, connectionIcons } from "@/lib/constants";
import { useModal } from "@/providers/modal-provider";
import type { ConnectionData, ConnectionType } from "@/lib/types";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

interface Props {
  onSubmit: (data: ConnectionData) => Promise<void>;
}

type Step = "selectProvider" | "providerConfig";

const PAGE_SIZE = 9;

export function ConnectionForm({ onSubmit }: Props) {
  const [step, setStep] = useState<Step>("selectProvider");
  const [selectedType, setSelectedType] = useState<ConnectionType | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const { setClose } = useModal();

  const config_ = selectedType ? integrationConfigs[selectedType] : undefined;
  const inputs = config_?.inputs ?? [];

  const allTypes = (Object.keys(integrationConfigs) as ConnectionType[]).sort((a, b) => {
    const aSoon = !!integrationConfigs[a].comingSoon;
    const bSoon = !!integrationConfigs[b].comingSoon;
    if (aSoon === bSoon) return a.localeCompare(b);
    return aSoon ? 1 : -1;
  });
  const totalPages = Math.ceil(allTypes.length / PAGE_SIZE);
  const pagedTypes = allTypes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const emptySlots = PAGE_SIZE - pagedTypes.length;

  const handleInputChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedType || !name) return;
    setSubmitting(true);
    try {
      await onSubmit({ type: selectedType, name, description, config });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "selectProvider") {
    return (
      <div className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-1 grid-rows-3">
          {pagedTypes.map((type) => {
            const cfg = integrationConfigs[type];
            return (
              <button
                key={type}
                type="button"
                className={`text-left px-2 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                  selectedType === type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                } ${cfg.comingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (cfg.comingSoon) return;
                  setSelectedType(type);
                  setStep("providerConfig");
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
                {cfg.comingSoon && (
                  <span className="text-[9px] text-muted-foreground ml-auto">Soon</span>
                )}
              </button>
            );
          })}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      <button
        type="button"
        onClick={() => setStep("selectProvider")}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back
      </button>
      <div className="flex items-center gap-3">
        {selectedType && (
          <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
            <Image
              src={connectionIcons[selectedType]}
              alt={selectedType}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h3 className="font-semibold">Configure {selectedType}</h3>
          {config_?.description ? (
            <p className="text-sm text-muted-foreground">{config_.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Enter your credentials</p>
          )}
        </div>
      </div>
      {config_?.features && config_.features.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium mb-1.5">This connection enables:</p>
          <div className="flex flex-wrap gap-1.5">
            {config_.features.map((feature) => (
              <span key={feature} className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
      {(() => {
        const compact = inputs.length <= 3;
        const gridClass = compact ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4";
        return (
          <div className={gridClass}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Connection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            {inputs.map(({ key, type, label, defaultValue, options }) => (
              <div key={key} className={`space-y-2 ${!compact && type === "select" ? "md:col-span-2" : ""}`}>
                <Label htmlFor={key}>{label || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Label>
                {type === "select" && options ? (
                  <Select
                    value={config[key] || defaultValue || ""}
                    onValueChange={(value) => handleInputChange(key, value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={key}
                    type={type}
                    value={config[key] || defaultValue || ""}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={type === "password" ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })()}
      <div className="flex justify-end gap-2 pb-4">
        <Button variant="ghost" onClick={setClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !name || inputs.some(({ key, defaultValue }) => !config[key] && defaultValue === undefined)}
        >
          {submitting ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </div>
  );
}
