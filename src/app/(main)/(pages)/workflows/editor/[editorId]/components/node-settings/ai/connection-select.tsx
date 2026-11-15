"use client";

import { ConnectionSelect } from "../connection-select";

export function AIConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="AI" value={value} onChange={onChange} />;
}
