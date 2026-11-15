"use client";

import { ConnectionSelect } from "../connection-select";

export function DiscordConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="Discord" value={value} onChange={onChange} />;
}
