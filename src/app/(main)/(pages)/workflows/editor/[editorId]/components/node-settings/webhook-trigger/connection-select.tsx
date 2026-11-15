"use client";

import { ConnectionSelect } from "../connection-select";

export function WebhookConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="Webhook" value={value} onChange={onChange} />;
}
