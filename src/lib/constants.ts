import type { ConnectionType, IntegrationConfig } from "./types";

export const integrationConfigs: Record<ConnectionType, IntegrationConfig> = {
  GitHub: {
    inputs: [
      { key: "personalAccessToken", type: "password" },
      { key: "repoUrl", type: "text" },
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
  Slack: "/slack.png",
  Discord: "/discord.png",
  OpenAI: "/openai.png",
  Notion: "/notion.png",
  "Google Drive": "/googleDrive.png",
};
