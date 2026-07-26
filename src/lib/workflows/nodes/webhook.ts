import type { NodeHandlerResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleWebhookTrigger(meta: Record<string, string>): NodeHandlerResult {
  const connectionId = meta.connectionId;

  if (!connectionId) {
    return {
      success: false,
      message: "Webhook connection is required. Select a Webhook connection in the trigger settings.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;

  if (meta.testPayload) {
    try {
      payload = JSON.parse(meta.testPayload);
    } catch {
      return {
        success: false,
        message: "Invalid test payload JSON. Please provide valid JSON.",
      };
    }
  } else {
    payload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook payload. Add a test payload in the trigger settings to customize.",
      },
    };
  }

  return {
    success: true,
    message: `Webhook trigger ready. Would process payload from connection ${connectionId}.`,
    data: payload,
  };
}
