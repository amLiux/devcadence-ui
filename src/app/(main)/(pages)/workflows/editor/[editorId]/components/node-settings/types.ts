export interface NodeSettingsProps {
  meta: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}
