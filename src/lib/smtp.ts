import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  secure?: boolean;
  fromEmail: string;
}

export function createSmtpTransporter(config: SmtpConfig) {
  const secure = config.secure ?? config.port === 465;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string;
  bcc?: string;
  from?: string;
}

export async function sendEmail(config: SmtpConfig, options: SendEmailOptions) {
  const transporter = createSmtpTransporter(config);
  const from = options.from || config.fromEmail;
  const result = await transporter.sendMail({
    from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.html ? undefined : options.body,
    html: options.html || options.body,
  });
  return { messageId: result.messageId, accepted: result.accepted, rejected: result.rejected };
}
