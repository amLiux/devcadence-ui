import type { NodeCardDef } from "./node-catalog";

export const triggerNodes: NodeCardDef[] = [
  {
    type: "Trigger",
    title: "Webhook",
    description: "Trigger on incoming webhook event",
    requiresConnection: "Webhook",
  },
  { type: "Trigger", title: "Schedule", description: "Trigger on a cron schedule" },
  {
    type: "Trigger",
    title: "Listen Discord Messages",
    description: "Trigger on new Discord channel messages",
    requiresConnection: "Discord",
  },
  {
    type: "Trigger",
    title: "Watch Emails",
    description: "Trigger on new Gmail messages matching a query",
    requiresConnection: "Google",
  },
  {
    type: "Trigger",
    title: "New Calendar Event",
    description: "Trigger on new or updated calendar events",
    requiresConnection: "Google",
  },
  {
    type: "Trigger",
    title: "Input",
    description: "Receive data from parent workflow (sub-workflows only)",
  },
  {
    type: "GitHub",
    title: "Listen Commits",
    description: "Trigger on new pushes to a repo",
    requiresConnection: "GitHub",
  },
  {
    type: "GitHub",
    title: "Listen Pull Requests",
    description: "Trigger on PR events (open, close, merge)",
    requiresConnection: "GitHub",
  },
  {
    type: "GitHub",
    title: "Listen Issues",
    description: "Trigger on issue events (open, close, label)",
    requiresConnection: "GitHub",
  },
  {
    type: "GitHub",
    title: "Listen Comments",
    description: "Trigger on comments on issues or PRs",
    requiresConnection: "GitHub",
  },
  {
    type: "GitHub",
    title: "Listen Releases",
    description: "Trigger when a release is published",
    requiresConnection: "GitHub",
  },
];
