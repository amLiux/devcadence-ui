"use client";

import React from "react";
import type { NodeSettingsProps } from "./types";
import {
  TransformDataSettings,
  ConditionalSettings,
} from "./expression-nodes";
import { HttpRequestSettings } from "./http-request";
import { ScrapeSettings } from "./scrape";
import {
  ListenCommitsSettings,
  ListenPRsSettings,
  ListenIssuesSettings,
  ListenCommentsSettings,
  ListenReleasesSettings,
} from "./github-triggers";
import {
  CreateIssueSettings,
  AddCommentSettings,
  AddLabelSettings,
  RequestReviewSettings,
} from "./github-actions";
import {
  PostgresQuerySettings,
  PostgresInsertSettings,
  PostgresUpdateSettings,
  PostgresDeleteSettings,
} from "./postgresql";
import { WebhookSettings } from "./webhook-trigger";
import { PromptSettings, ClassifySettings, ExtractSettings } from "./ai";
import { CallWorkflowSettings } from "./call-workflow";
import { InputSettings } from "./input";
import { ReturnSettings } from "./return";
import { BuildJsonSettings } from "./build-json";
import { RetryLoopSettings } from "./retry-loop";
import { SendEmailSettings } from "./smtp";
import { SendMessageSettings } from "./slack";
import { SendDiscordMessageSettings, ReadDiscordMessagesSettings, SendDirectMessageSettings, ListenDiscordMessagesSettings } from "./discord";
import { ScanDependenciesSettings } from "./scan-dependencies";
import { ScheduleSettings } from "./schedule";

const SETTINGS_REGISTRY: Record<string, React.FC<NodeSettingsProps & { parentOutput?: unknown; hasParentEdge?: boolean }>> = {
  Webhook: WebhookSettings,
  Schedule: ScheduleSettings,
  "Listen Commits": ListenCommitsSettings,
  "Listen Pull Requests": ListenPRsSettings,
  "Listen Issues": ListenIssuesSettings,
  "Listen Comments": ListenCommentsSettings,
  "Listen Releases": ListenReleasesSettings,
  "Create Issue": CreateIssueSettings,
  "Add Comment": AddCommentSettings,
  "Add Label": AddLabelSettings,
  "Request Review": RequestReviewSettings,
  "HTTP Request": HttpRequestSettings,
  Scrape: ScrapeSettings,
  "Transform Data": TransformDataSettings,
  Conditional: ConditionalSettings,
  "PostgreSQL Query": PostgresQuerySettings,
  "PostgreSQL Insert": PostgresInsertSettings,
  "PostgreSQL Update": PostgresUpdateSettings,
  "PostgreSQL Delete": PostgresDeleteSettings,
  Prompt: PromptSettings,
  Classify: ClassifySettings,
  Extract: ExtractSettings,
  "Call Workflow": CallWorkflowSettings,
  "Build JSON": BuildJsonSettings,
  "Retry Loop": RetryLoopSettings,
  Input: InputSettings,
  Return: ReturnSettings,
  "Send Email": SendEmailSettings,
  "Send Slack Message": SendMessageSettings,
  "Send Discord Message": SendDiscordMessageSettings,
  "Read Discord Messages": ReadDiscordMessagesSettings,
  "Send Direct Message": SendDirectMessageSettings,
  "Listen Discord Messages": ListenDiscordMessagesSettings,
  "Scan Dependencies": ScanDependenciesSettings,
};

export { SETTINGS_REGISTRY };
