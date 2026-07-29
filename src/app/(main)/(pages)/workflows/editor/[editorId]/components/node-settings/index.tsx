"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import type { NodeSettingsProps } from "./types";
import {
  TransformDataSettings,
  ConditionalSettings,
} from "./expression-nodes";
import { HttpRequestSettings } from "./http-request";
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

function ScheduleSettings({ meta, handleChange }: NodeSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Cron Expression</label>
        <Input className="h-8 text-xs" placeholder="*/5 * * * *" value={meta.cron || ""} onChange={(e) => handleChange("cron", e.target.value)} />
      </div>
    </div>
  );
}

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
};

export { SETTINGS_REGISTRY };
