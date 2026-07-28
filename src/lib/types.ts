export type ConnectionType = "GitHub" | "PostgreSQL" | "Webhook" | "Slack" | "Discord" | "AI" | "SMTP" | "SSH" | "Gmail" | "Notion" | "Google Drive";

export interface Connection {
  id: string;
  type: ConnectionType;
  name: string;
  description: string;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface RequestOptions {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export type StepperFormStep = "selectProvider" | "providerConfig" | "submit";

export interface FormData {
  [key: string]: string | boolean;
}

export interface ConnectionData {
  type: ConnectionType;
  name: string;
  description?: string;
  config: Record<string, string>;
}

export interface InputConfig {
  key: string;
  type: "text" | "password" | "select";
  label?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
}

export interface CheckboxConfig {
  id: string;
  name: string;
  label: string;
}

export interface IntegrationConfig {
  inputs: InputConfig[];
  checkboxes: CheckboxConfig[];
  comingSoon?: boolean;
  description?: string;
  features?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: string;  // "workflow" | "sub-workflow"
  nodes: string | null;
  edges: string | null;
  flowPath: string | null;
  publish: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowFormData {
  name: string;
  description: string;
}

export interface EditorNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: EditorNodeData;
}

export interface EditorNodeData {
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  metadata: Record<string, unknown>;
  type: "Trigger" | "Action" | "GitHub" | "PostgreSQL" | "AI";
}

export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export type WorkflowTriggerType = "webhook" | "schedule" | "github" | "sub-workflow" | "manual";

const TRIGGER_TITLE_MAP: Record<string, WorkflowTriggerType> = {
  Webhook: "webhook",
  Schedule: "schedule",
  Input: "sub-workflow",
  "Listen Commits": "github",
  "Listen Pull Requests": "github",
  "Listen Issues": "github",
  "Listen Comments": "github",
  "Listen Releases": "github",
};

export function inferTriggerType(nodesJson: string | null, workflowType?: string): WorkflowTriggerType {
  if (workflowType === "sub-workflow") return "sub-workflow";
  if (!nodesJson) return "manual";
  try {
    const nodes = JSON.parse(nodesJson) as EditorNode[];
    for (const node of nodes) {
      const trigger = TRIGGER_TITLE_MAP[node.data.title];
      if (trigger) return trigger;
    }
    return "manual";
  } catch {
    return "manual";
  }
}

export const TRIGGER_TYPE_LABELS: Record<WorkflowTriggerType, string> = {
  webhook: "Webhook",
  schedule: "Scheduled",
  github: "GitHub Events",
  "sub-workflow": "Reusable",
  manual: "Manual",
};

export function createDefaultSubWorkflowNodes() {
  const now = Date.now();
  return {
    inputNode: {
      id: `Trigger-${now}`,
      type: "cardNode",
      position: { x: 350, y: 100 },
      data: { title: "Input", description: "Receive data from parent workflow", type: "Trigger", completed: false, current: false, metadata: {} },
    },
    returnNode: {
      id: `Action-${now + 1}`,
      type: "cardNode",
      position: { x: 350, y: 350 },
      data: { title: "Return", description: "Export values back to parent workflow", type: "Action", completed: false, current: false, metadata: {} },
    },
  };
}

export type LogLevel = "info" | "success" | "error" | "warning";

export interface LogEntry {
  type: LogLevel;
  message: string;
  timestamp: string;
}

export interface NodeDebugLog {
  nodeId: string;
  title: string;
  success: boolean;
  logs: LogEntry[];
}

export interface ContextEntry {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  success: boolean;
  error: string | null;
}

// For the context viewer (flat, by node ID)
export type WorkflowContext = Record<string, ContextEntry>;

// For Transform Data (linked list)
export interface ContextStep {
  name: string;
  outputName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  success: boolean;
  error: string | null;
  previousStep?: ContextStep;
}
