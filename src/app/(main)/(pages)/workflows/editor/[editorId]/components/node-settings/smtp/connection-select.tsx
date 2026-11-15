"use client";

import { ConnectionSelect } from "../connection-select";

export function SmtpConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="SMTP" value={value} onChange={onChange} />;
}
