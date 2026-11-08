-- Workflow-level variables available to templates as {{workflow.name}}.

ALTER TABLE "Workflow" ADD COLUMN "variables" JSONB;
