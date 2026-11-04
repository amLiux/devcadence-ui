export interface NodeSettingsProps {
  meta: Record<string, string>;
  /** Project of the workflow being edited, used by the Call Workflow picker. */
  currentProjectId?: string;
  handleChange: (key: string, value: string) => void;
  updateMeta?: (patch: Record<string, string>) => void;
}
