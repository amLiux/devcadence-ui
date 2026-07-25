export type ConnectionType = "GitHub" | "Slack" | "Discord" | "OpenAI" | "Notion" | "Google Drive";

export interface Connection {
  id: string;
  name: string;
  description: string;
  formData: Record<string, string | boolean>;
  type: ConnectionType;
  lastUpdate: string;
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
  data: FormData;
  connectionType: ConnectionType;
  id?: string;
}

export interface ConnectionResponse {
  id: string;
  name: string;
  description: string;
  type: string;
  formData: Record<string, string>;
  lastUpdate: string;
}

export interface InputConfig {
  key: string;
  type: "text" | "password";
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
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
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
  type: "Trigger" | "Action" | "GitHub";
}

export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export type WorkflowTriggerType = "webhook" | "schedule" | "github" | "manual";

const TRIGGER_TITLE_MAP: Record<string, WorkflowTriggerType> = {
  Webhook: "webhook",
  Schedule: "schedule",
  "Listen Commits": "github",
  "Listen Pull Requests": "github",
  "Listen Issues": "github",
  "Listen Comments": "github",
  "Listen Releases": "github",
};

export function inferTriggerType(nodesJson: string | null): WorkflowTriggerType {
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
  manual: "Manual",
};

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  success: boolean;
  error: string | null;
  previousStep?: ContextStep;
}
