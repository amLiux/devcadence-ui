"use client";

import { ConnectionSelect } from "../connection-select";

export function SlackConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="Slack" value={value} onChange={onChange} />;
}
