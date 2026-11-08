import Image from "next/image";
import {
  ArrowRightLeft,
  Database,
  GitBranch,
  GitFork,
  LogIn,
  LogOut,
  Mail,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Connection, EditorNodeData } from "@/lib/types";

export type NodeCategory = "Communication" | "Repository" | "Data" | "AI" | "Core" | "Security";

export interface NodeCardDef {
  type: EditorNodeData["type"];
  title: string;
  description: string;
  requiresConnection?: Connection["type"];
  category?: NodeCategory;
}

export const MAX_EXPANDED_CATEGORIES = 2;

export const categoryOrder: NodeCategory[] = [
  "Communication",
  "Repository",
  "Data",
  "AI",
  "Core",
  "Security",
];

export const categoryLabels: Record<NodeCategory, string> = {
  Communication: "Communication",
  Repository: "Repository",
  Data: "Data",
  AI: "AI",
  Core: "Core",
  Security: "Security",
};

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

export const actionNodes: NodeCardDef[] = [
  {
    type: "GitHub",
    title: "Create Issue",
    description: "Create a new issue with labels and assignees",
    requiresConnection: "GitHub",
    category: "Repository",
  },
  {
    type: "GitHub",
    title: "Add Comment",
    description: "Post a comment on an issue or PR",
    requiresConnection: "GitHub",
    category: "Repository",
  },
  {
    type: "GitHub",
    title: "Add Label",
    description: "Add a label to an issue or PR",
    requiresConnection: "GitHub",
    category: "Repository",
  },
  {
    type: "GitHub",
    title: "Request Review",
    description: "Request a review on a pull request",
    requiresConnection: "GitHub",
    category: "Repository",
  },
  {
    type: "Action",
    title: "HTTP Request",
    description: "Make an HTTP request to an API",
    category: "Core",
  },
  {
    type: "Action",
    title: "Scrape",
    description: "Fetch a page and extract its main text",
    category: "Core",
  },
  {
    type: "Action",
    title: "Transform Data",
    description: "Map, filter, or transform data",
    category: "Core",
  },
  {
    type: "Action",
    title: "Build JSON",
    description: "Build a JSON object from fields",
    category: "Core",
  },
  {
    type: "Action",
    title: "Conditional",
    description: "Branch based on a condition (success/failure paths)",
    category: "Core",
  },
  {
    type: "Action",
    title: "Retry Loop",
    description: "HTTP request with retry until condition met",
    category: "Core",
  },
  {
    type: "Action",
    title: "Call Workflow",
    description: "Call a reusable sub-workflow",
    category: "Core",
  },
  {
    type: "Action",
    title: "Return",
    description: "Export values back to parent workflow (sub-workflows only)",
    category: "Core",
  },
  {
    type: "PostgreSQL",
    title: "PostgreSQL Query",
    description: "Execute a SELECT query",
    requiresConnection: "PostgreSQL",
    category: "Data",
  },
  {
    type: "PostgreSQL",
    title: "PostgreSQL Insert",
    description: "Insert a row into a table",
    requiresConnection: "PostgreSQL",
    category: "Data",
  },
  {
    type: "PostgreSQL",
    title: "PostgreSQL Update",
    description: "Update rows in a table",
    requiresConnection: "PostgreSQL",
    category: "Data",
  },
  {
    type: "PostgreSQL",
    title: "PostgreSQL Delete",
    description: "Delete rows from a table",
    requiresConnection: "PostgreSQL",
    category: "Data",
  },
  {
    type: "AI",
    title: "Prompt",
    description: "Send a prompt to AI and get a response",
    requiresConnection: "AI",
    category: "AI",
  },
  {
    type: "AI",
    title: "Classify",
    description: "Classify text into categories using AI",
    requiresConnection: "AI",
    category: "AI",
  },
  {
    type: "AI",
    title: "Extract",
    description: "Extract structured data from text using AI",
    requiresConnection: "AI",
    category: "AI",
  },
  {
    type: "SMTP",
    title: "Send Email",
    description: "Send an email via SMTP",
    requiresConnection: "SMTP",
    category: "Communication",
  },
  {
    type: "Slack",
    title: "Send Slack Message",
    description: "Post a message to a Slack channel",
    requiresConnection: "Slack",
    category: "Communication",
  },
  {
    type: "Discord",
    title: "Send Discord Message",
    description: "Send a message to a Discord channel",
    requiresConnection: "Discord",
    category: "Communication",
  },
  {
    type: "Discord",
    title: "Read Discord Messages",
    description: "Fetch recent messages from a channel",
    requiresConnection: "Discord",
    category: "Communication",
  },
  {
    type: "Discord",
    title: "Send Direct Message",
    description: "Send a DM to a Discord user",
    requiresConnection: "Discord",
    category: "Communication",
  },
  {
    type: "Security",
    title: "Scan Dependencies",
    description: "Scan repo dependencies for known vulnerabilities",
    requiresConnection: "GitHub",
    category: "Security",
  },
];

export const iconMap: Record<string, React.ReactNode> = {
  Trigger: <Zap className="h-3 w-3 text-yellow-500" />,
  Action: <Settings className="h-3 w-3 text-blue-500" />,
  GitHub: <GitBranch className="h-3 w-3 text-foreground" />,
  Conditional: <GitFork className="h-3 w-3 text-orange-500" />,
  PostgreSQL: <Database className="h-3 w-3 text-blue-600" />,
  AI: <Sparkles className="h-3 w-3 text-purple-500" />,
  "Call Workflow": <ArrowRightLeft className="h-3 w-3 text-emerald-500" />,
  Input: <LogIn className="h-3 w-3 text-cyan-500" />,
  Return: <LogOut className="h-3 w-3 text-amber-500" />,
  SMTP: <Mail className="h-3 w-3 text-red-500" />,
  Slack: <Image src="/slack.png" alt="Slack" width={12} height={12} className="object-contain" />,
  Security: <Shield className="h-3 w-3 text-emerald-500" />,
  "Scan Dependencies": <Shield className="h-3 w-3 text-emerald-500" />,
  Discord: <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />,
  "Send Discord Message": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
  "Read Discord Messages": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
  "Send Direct Message": (
    <Image src="/discord.png" alt="Discord" width={12} height={12} className="object-contain" />
  ),
};
