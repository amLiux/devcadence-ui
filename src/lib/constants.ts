import type { ConnectionType, IntegrationConfig } from "./types";

export const integrationConfigs: Record<ConnectionType, IntegrationConfig> = {
  GitHub: {
    inputs: [
      { key: "patToken", type: "password", label: "Personal Access Token" },
    ],
    checkboxes: [],
    description: "Connect to GitHub repos. Create issues, post comments, request reviews, and trigger workflows on commits, PRs, and releases.",
    features: ["Create Issue", "Add Comment", "Add Label", "Request Review", "Listen Commits", "Listen PRs", "Listen Issues", "Listen Comments", "Listen Releases"],
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
    description: "Query and modify PostgreSQL databases. Run SELECT, INSERT, UPDATE, and DELETE queries with template variable support.",
    features: ["PostgreSQL Query", "PostgreSQL Insert", "PostgreSQL Update", "PostgreSQL Delete"],
  },
  Webhook: {
    inputs: [
      { key: "secret", type: "password", label: "Secret (optional, for HMAC verification)", defaultValue: "" },
    ],
    checkboxes: [],
    description: "Receive incoming HTTP webhooks to trigger workflows. Optional HMAC-SHA256 signature verification for security.",
    features: ["Webhook Trigger"],
  },
  AI: {
    inputs: [
      { key: "provider", type: "select", label: "Provider", options: [
        { value: "openai", label: "OpenAI" },
        { value: "claude", label: "Claude" },
      ]},
      { key: "apiKey", type: "password", label: "API Key" },
      { key: "model", type: "text", label: "Model (optional)" },
    ],
    checkboxes: [],
    description: "Use AI to process text. Send prompts, classify content into categories, or extract structured data from unstructured text.",
    features: ["Prompt", "Classify", "Extract"],
  },
  SSH: {
    inputs: [
      { key: "host", type: "text", label: "Host" },
      { key: "port", type: "text", label: "Port", defaultValue: "22" },
      { key: "user", type: "text", label: "Username" },
      { key: "privateKey", type: "password", label: "Private Key (or use password)" },
      { key: "password", type: "password", label: "Password (or use private key)" },
    ],
    checkboxes: [],
    description: "Connect to remote servers via SSH. Execute commands, deploy code, and manage infrastructure.",
    features: ["Execute Command"],
    comingSoon: true,
  },
  Gmail: {
    inputs: [],
    checkboxes: [],
    description: "Send emails through Gmail using OAuth2. No API key needed — just sign in with your Google account.",
    features: ["Send Email"],
    comingSoon: true,
  },
  SMTP: {
    inputs: [
      { key: "host", type: "text", label: "SMTP Host" },
      { key: "port", type: "text", label: "Port", defaultValue: "587" },
      { key: "user", type: "text", label: "Username (optional)", defaultValue: "" },
      { key: "password", type: "password", label: "Password (optional)", defaultValue: "" },
      { key: "fromEmail", type: "text", label: "From Email" },
      { key: "secure", type: "select", label: "TLS", options: [
        { value: "auto", label: "Auto (port 465 = TLS, otherwise STARTTLS)" },
        { value: "true", label: "Force TLS" },
        { value: "false", label: "No TLS" },
      ], defaultValue: "auto" },
    ],
    checkboxes: [],
    description: "Send emails through any SMTP server. Works with SendGrid, Mailgun, AWS SES, MailHog, or your own mail server.",
    features: ["Send Email"],
  },
  Slack: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
    description: "Send messages and notifications to Slack channels.",
    features: ["Send Message"],
  },
  Discord: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
    description: "Send messages and notifications to Discord channels.",
    features: ["Send Message"],
  },
  Notion: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
    description: "Read and write Notion pages and databases.",
    features: ["Query Database", "Create Page"],
  },
  "Google Drive": {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
    description: "Access and manage Google Drive files and folders.",
    features: ["Upload File", "List Files"],
  },
};

export const connectionIcons: Record<ConnectionType, string> = {
  GitHub: "/github.png",
  PostgreSQL: "/postgresql.svg",
  Webhook: "/dd-logo.svg",
  Slack: "/slack.png",
  Discord: "/discord.png",
  AI: "/dd-logo.svg",
  SMTP: "/dd-logo.svg",
  SSH: "/dd-logo.svg",
  Gmail: "/gmail.png",
  Notion: "/notion.png",
  "Google Drive": "/googleDrive.png",
};
