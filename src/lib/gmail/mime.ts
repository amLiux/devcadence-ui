export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string;
  bcc?: string;
  from?: string;
  inReplyTo?: string;
  references?: string;
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function bodyPart(contentType: string, body: string): string[] {
  return [
    `Content-Type: ${contentType}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
  ];
}

/**
 * Gmail's send endpoint wants a base64url encoded RFC 2822 message.
 * Multipart is only used when an HTML body is provided.
 */
export function buildRawEmail(email: OutgoingEmail, boundary = `devcadence-${Date.now()}`): string {
  const headers = [
    ...(email.from ? [`From: ${email.from}`] : []),
    `To: ${email.to}`,
    ...(email.cc ? [`Cc: ${email.cc}`] : []),
    ...(email.bcc ? [`Bcc: ${email.bcc}`] : []),
    `Subject: ${encodeHeader(email.subject)}`,
    ...(email.inReplyTo ? [`In-Reply-To: ${email.inReplyTo}`] : []),
    ...(email.references ? [`References: ${email.references}`] : []),
    "MIME-Version: 1.0",
  ];

  const lines = email.html
    ? [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        ...bodyPart("text/plain", email.text),
        `--${boundary}`,
        ...bodyPart("text/html", email.html),
        `--${boundary}--`,
      ]
    : [...headers, ...bodyPart("text/plain", email.text)];

  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

export function stripReplyPrefix(subject: string): string {
  return subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").trim();
}
