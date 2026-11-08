"use client";

import { useState } from "react";
import { integrationConfigs } from "@/lib/constants";
import { useModal } from "@/providers/modal-provider";
import type { Connection, ConnectionData, ConnectionType, InputConfig } from "@/lib/types";

export type Step = "selectProvider" | "providerConfig";

const PAGE_SIZE = 9;

export interface ConnectionFormProps {
  initialData?: Connection;
  onSubmit: (data: ConnectionData) => Promise<void>;
  onUpdate?: (id: string, data: ConnectionData) => Promise<void>;
}

export function useConnectionForm({ initialData, onSubmit, onUpdate }: ConnectionFormProps) {
  const [step, setStep] = useState<Step>(initialData ? "providerConfig" : "selectProvider");
  const [selectedType, setSelectedType] = useState<ConnectionType | "">(initialData?.type ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [config, setConfig] = useState<Record<string, string>>(() => {
    if (!initialData) return {};
    // Never put stored secrets in the form state: password inputs render empty
    // and the original value is re-attached on save when the user leaves it blank.
    const stored = { ...initialData.config };
    const passwordKeys =
      integrationConfigs[initialData.type]?.inputs
        .filter((input) => input.type === "password")
        .map((input) => input.key) ?? [];
    for (const key of passwordKeys) delete stored[key];
    return stored;
  });
  const [touchedPasswordKeys, setTouchedPasswordKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const { setClose } = useModal();

  const config_ = selectedType ? integrationConfigs[selectedType] : undefined;
  const inputs = config_?.inputs ?? [];

  const fieldDefaults = Object.fromEntries(
    inputs.map(({ key, defaultValue }) => [key, defaultValue ?? ""]),
  ) as Record<string, string>;
  const values: Record<string, string> = { ...fieldDefaults, ...config };

  const storedSecrets = initialData?.config ?? {};
  const hasStoredSecret = (key: string) =>
    typeof storedSecrets[key] === "string" && storedSecrets[key].length > 0;

  const getFieldState = (
    input: InputConfig,
  ): { missing: boolean; requirement: "required" | "optional" } => {
    const current = (key: string) => values[key] ?? "";

    if (input.type === "password" && hasStoredSecret(input.key) && !current(input.key)) {
      return { missing: false, requirement: "optional" };
    }

    if (input.requiredWhen) {
      const required = input.requiredWhen.equals.includes(current(input.requiredWhen.key));
      return {
        missing: required && !current(input.key),
        requirement: required ? "required" : "optional",
      };
    }

    if (input.optionalWhen) {
      const optional = input.optionalWhen.equals.includes(current(input.optionalWhen.key));
      if (optional) return { missing: false, requirement: "optional" };
      return {
        missing: !current(input.key) && input.defaultValue === undefined,
        requirement: "required",
      };
    }

    if (input.optional) return { missing: false, requirement: "optional" };
    const required = input.defaultValue === undefined;
    return {
      missing: required && !current(input.key),
      requirement: required ? "required" : "optional",
    };
  };
  const hasMissing = inputs.some((input) => getFieldState(input).missing);

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
    setConfig((previous) => ({ ...previous, [key]: value }));
    const input = inputs.find((item) => item.key === key);
    if (input?.type === "password") {
      setTouchedPasswordKeys((previous) => new Set(previous).add(key));
    }
  };

  const touchField = (key: string) => {
    setTouchedPasswordKeys((previous) => new Set(previous).add(key));
  };

  const handleSubmit = async () => {
    if (!selectedType || !name) return;
    setSubmitting(true);
    try {
      const merged = { ...fieldDefaults, ...config };
      for (const input of inputs) {
        if (
          input.type === "password" &&
          !merged[input.key] &&
          hasStoredSecret(input.key) &&
          !touchedPasswordKeys.has(input.key)
        ) {
          merged[input.key] = storedSecrets[input.key];
        }
      }
      const data = {
        type: selectedType,
        name,
        description,
        config: merged,
      };
      if (initialData && onUpdate) {
        await onUpdate(initialData.id, data);
      } else {
        await onSubmit(data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    selectedType,
    setSelectedType,
    name,
    setName,
    description,
    setDescription,
    config_,
    inputs,
    values,
    page,
    setPage,
    pagedTypes,
    totalPages,
    emptySlots,
    getFieldState,
    hasMissing,
    handleInputChange,
    touchField,
    handleSubmit,
    submitting,
    setClose,
    initialData,
    hasStoredSecret,
  };
}
