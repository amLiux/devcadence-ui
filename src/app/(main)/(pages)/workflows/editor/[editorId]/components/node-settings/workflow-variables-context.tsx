"use client";

import { createContext, useContext, type ReactNode } from "react";

const WorkflowVariablesContext = createContext<Record<string, string>>({});

export function WorkflowVariablesProvider({
  value,
  children,
}: {
  value?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <WorkflowVariablesContext.Provider value={value ?? {}}>
      {children}
    </WorkflowVariablesContext.Provider>
  );
}

export function useWorkflowVariables(): Record<string, string> {
  return useContext(WorkflowVariablesContext);
}

/** State for one node field backed by a workflow variable. */
export function useWorkflowDefault(
  variable: string,
  value: string,
  onChange: (value: string) => void,
) {
  const variables = useWorkflowVariables();
  const template = `{{workflow.${variable}}}`;

  return {
    available: Boolean(variables[variable]),
    enabled: value === template,
    toggle: (checked: boolean) => onChange(checked ? template : ""),
    template,
  };
}
