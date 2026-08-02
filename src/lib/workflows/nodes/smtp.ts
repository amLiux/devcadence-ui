import { sendEmail, type SmtpConfig } from "@/lib/smtp";
import { getConnection } from "@/lib/db/connections";
import { resolveTemplates } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";
import type { ContextStep } from "@/lib/workflow-context";

export async function handleSendEmail(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const connectionId = meta.connectionId;
  if (!connectionId) {
    return { success: false, message: "No SMTP connection selected" };
  }

  const connection = await getConnection(connectionId);
  if (!connection) {
    return { success: false, message: "SMTP connection not found" };
  }

  const connConfig = connection.config as Record<string, string>;
  const secureRaw = connConfig.secure || "auto";
  const port = parseInt(connConfig.port || "587", 10);
  const secure = secureRaw === "auto" ? port === 465 : secureRaw === "true";
  const config: SmtpConfig = {
    host: connConfig.host,
    port,
    user: connConfig.user,
    password: connConfig.password,
    secure,
    fromEmail: connConfig.fromEmail,
  };

  const resolve = (v: string) => resolveTemplates(v, ancestorChain);
  const to = resolve(meta.to || "");
  const subject = resolve(meta.subject || "");
  const body = resolve(meta.body || "");
  const cc = meta.cc ? resolve(meta.cc) : undefined;
  const bcc = meta.bcc ? resolve(meta.bcc) : undefined;
  const html = meta.isHtml === "true" ? body : undefined;

  try {
    const result = await sendEmail(config, { to, subject, body, html, cc, bcc });
    return {
      success: true,
      message: `Email sent to ${result.accepted.join(", ")}`,
      data: result,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to send email";
    return { success: false, message: msg };
  }
}
