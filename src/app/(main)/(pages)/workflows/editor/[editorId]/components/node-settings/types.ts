export interface NodeSettingsProps {
  meta: Record<string, string>;
  handleChange: (key: string, value: string) => void;
  updateMeta?: (patch: Record<string, string>) => void;
}
