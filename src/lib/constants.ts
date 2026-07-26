import type { ConnectionType, IntegrationConfig } from "./types";

export const integrationConfigs: Record<ConnectionType, IntegrationConfig> = {
  GitHub: {
    inputs: [
      { key: "patToken", type: "password", label: "Personal Access Token" },
    ],
    checkboxes: [],
  },
  PostgreSQL: {
    inputs: [
      { key: "host", type: "text", label: "Host" },
      { key: "port", type: "text", label: "Port", defaultValue: "5432" },
      { key: "database", type: "text", label: "Database" },
      { key: "user", type: "text", label: "User" },
      { key: "password", type: "password", label: "Password" },
    ],
    checkboxes: [],
  },
  Webhook: {
    inputs: [
      { key: "secret", type: "password", label: "Secret (optional, for HMAC verification)", defaultValue: "" },
    ],
    checkboxes: [],
  },
  Slack: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
  },
  Discord: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
  },
  AI: {
    inputs: [
      { key: "provider", type: "text", label: "Provider (opencode, claude, openai)" },
      { key: "apiKey", type: "password", label: "API Key" },
      { key: "model", type: "text", label: "Model (optional)" },
    ],
    checkboxes: [],
  },
  Notion: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
  },
  "Google Drive": {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
  },
};

export const connectionIcons: Record<ConnectionType, string> = {
  GitHub: "/github.png",
  PostgreSQL: "/postgresql.svg",
  Webhook: "/webhook.svg",
  Slack: "/slack.png",
  Discord: "/discord.png",
  AI: "/openai.png",
  Notion: "/notion.png",
  "Google Drive": "/googleDrive.png",
};
