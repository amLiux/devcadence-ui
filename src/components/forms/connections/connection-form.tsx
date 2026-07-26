"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { integrationConfigs, connectionIcons } from "@/lib/constants";
import { useModal } from "@/providers/modal-provider";
import type { ConnectionData, ConnectionType } from "@/lib/types";

interface Props {
  onSubmit: (data: ConnectionData) => Promise<void>;
}

type Step = "selectProvider" | "providerConfig";

export function ConnectionForm({ onSubmit }: Props) {
  const [step, setStep] = useState<Step>("selectProvider");
  const [selectedType, setSelectedType] = useState<ConnectionType | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { setClose } = useModal();

  const config_ = selectedType ? integrationConfigs[selectedType] : undefined;
  const inputs = config_?.inputs ?? [];

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
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {(Object.keys(integrationConfigs) as ConnectionType[]).map((type) => {
          const cfg = integrationConfigs[type];
          return (
            <button
              key={type}
              type="button"
              className={`text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
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
              <div className="h-8 w-8 flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src={connectionIcons[type]}
                  alt={type}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-sm">{type}</span>
              {cfg.comingSoon && (
                <span className="text-[10px] text-muted-foreground ml-auto">Soon</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
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
          <p className="text-sm text-muted-foreground">Enter your credentials</p>
        </div>
      </div>
      <div className="space-y-4">
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
        {inputs.map(({ key, type, label, defaultValue }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Label>
            <Input
              id={key}
              type={type}
              value={config[key] || defaultValue || ""}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={type === "password" ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between pb-4">
        <Button variant="outline" onClick={() => setStep("selectProvider")}>
          Back
        </Button>
        <div className="flex gap-2">
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
    </div>
  );
}
