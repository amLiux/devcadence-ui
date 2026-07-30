import type { NodeHandlerResult } from "./types";

export function handleScheduleTrigger(meta: Record<string, string>): NodeHandlerResult {
  const cron = meta.cron;
  if (!cron) {
    return {
      success: false,
      message: "Cron expression is required. Configure a schedule in the trigger settings.",
    };
  }

  return {
    success: true,
    message: `Schedule trigger fired on cron: ${cron}`,
    data: { cron, triggeredAt: new Date().toISOString() },
  };
}
