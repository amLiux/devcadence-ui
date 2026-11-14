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
      { key: "provider", type: "select", label: "Provider", defaultValue: "deepseek", options: [
        { value: "deepseek", label: "DeepSeek (default)" },
        { value: "openai", label: "OpenAI" },
        { value: "claude", label: "Claude" },
        { value: "custom", label: "Custom / local endpoint" },
      ]},
      { key: "baseUrl", type: "text", label: "Base URL", optional: true,
        requiredWhen: { key: "provider", equals: ["custom"] },
        placeholder: "https://api.deepseek.com",
        hint: "Leave empty for the provider default. DeepSeek: https://api.deepseek.com · Ollama: http://localhost:11434/v1" },
      { key: "apiKey", type: "password", label: "API Key",
        optionalWhen: { key: "provider", equals: ["custom"] },
        hint: "Required for hosted providers. Optional for a local endpoint." },
      { key: "model", type: "text", label: "Model", optional: true,
        placeholder: "deepseek-flash",
        hint: "Leave empty for the provider default: DeepSeek uses deepseek-flash." },
    ],
    checkboxes: [],
    description: "Use AI to process text through DeepSeek, OpenAI, Claude, or any local or self-hosted endpoint such as Ollama, vLLM or LM Studio.",
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
  Google: {
    inputs: [],
    checkboxes: [],
    description:
      "Authorize a Google account once so workflows can use Gmail, Calendar, Drive, Sheets and Docs. Tokens are stored encrypted and used by nodes on the server — this grants API access, it does not sign you in to DevCadence.",
    features: ["Send Email", "Search Emails", "Watch Emails", "Calendar Events", "Drive Files", "Sheets Rows", "Docs"],
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
    inputs: [
      { key: "botToken", type: "password", label: "Bot Token" },
    ],
    checkboxes: [],
    description: "Send messages and notifications to Slack channels.",
    features: ["Send Message"],
  },
  Discord: {
    inputs: [
      { key: "botToken", type: "password", label: "Bot Token" },
    ],
    checkboxes: [],
    description: "Send messages and notifications to Discord channels using a bot token.",
    features: ["Listen Discord Messages", "Send Discord Message", "Read Discord Messages", "Send Direct Message"],
  },
  Notion: {
    inputs: [],
    checkboxes: [],
    comingSoon: true,
    description: "Read and write Notion pages and databases.",
    features: ["Query Database", "Create Page"],
  },
};

/** Connection types that can validate their credentials with a test call. */
export const TESTABLE_CONNECTION_TYPES: ConnectionType[] = [
  "GitHub",
  "Slack",
  "Discord",
  "SMTP",
  "PostgreSQL",
  "AI",
];

export const connectionIcons: Record<ConnectionType, string> = {
  GitHub: "/github.png",
  PostgreSQL: "/postgresql.svg",
  Webhook: "/dd-logo.svg",
  Slack: "/slack.png",
  Discord: "/discord.png",
  AI: "/dd-logo.svg",
  SMTP: "/dd-logo.svg",
  SSH: "/dd-logo.svg",
  Notion: "/notion.png",
  Google: "/google.png",
};
