"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectionIcons } from "@/lib/constants";
import { ConnectionFields } from "./connection-fields";
import { ProviderPicker } from "./provider-picker";
import { useConnectionForm, type ConnectionFormProps } from "./use-connection-form";

export function ConnectionForm(props: ConnectionFormProps) {
  const form = useConnectionForm(props);

  if (form.step === "selectProvider") {
    return (
      <ProviderPicker
        pagedTypes={form.pagedTypes}
        emptySlots={form.emptySlots}
        totalPages={form.totalPages}
        page={form.page}
        onPageChange={form.setPage}
        selectedType={form.selectedType}
        onSelect={(type) => {
          form.setSelectedType(type);
          form.setStep("providerConfig");
        }}
      />
    );
  }

  return (
    <div className="space-y-4 px-4">
      {!form.initialData && (
        <button
          type="button"
          onClick={() => form.setStep("selectProvider")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
      )}
      <div className="flex items-center gap-3">
        {form.selectedType && (
          <div className="h-10 w-10 flex items-center justify-center overflow-hidden">
            <Image
              src={connectionIcons[form.selectedType]}
              alt={form.selectedType}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h3 className="font-semibold">Configure {form.selectedType}</h3>
          {form.config_?.description ? (
            <p className="text-sm text-muted-foreground">{form.config_.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Enter your credentials</p>
          )}
        </div>
      </div>
      {form.config_?.features && form.config_.features.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium mb-1.5">This connection enables:</p>
          <div className="flex flex-wrap gap-1.5">
            {form.config_.features.map((feature) => (
              <span
                key={feature}
                className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
      <ConnectionFields
        name={form.name}
        description={form.description}
        onNameChange={form.setName}
        onDescriptionChange={form.setDescription}
        inputs={form.inputs}
        values={form.values}
        compact={form.inputs.length <= 3}
        getFieldState={form.getFieldState}
        hasStoredSecret={form.hasStoredSecret}
        onInputChange={form.handleInputChange}
        onTouch={form.touchField}
      />
      <div className="flex justify-end gap-2 pb-4">
        <Button variant="ghost" onClick={form.setClose}>
          Cancel
        </Button>
        <Button onClick={form.handleSubmit} disabled={form.submitting || !form.name || form.hasMissing}>
          {form.submitting
            ? form.initialData
              ? "Saving..."
              : "Connecting..."
            : form.initialData
              ? "Save"
              : "Connect"}
        </Button>
      </div>
    </div>
  );
}
