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
  OpenAI: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
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
  PostgreSQL: "/postgresql.png",
  Slack: "/slack.png",
  Discord: "/discord.png",
  OpenAI: "/openai.png",
  Notion: "/notion.png",
  "Google Drive": "/googleDrive.png",
};
