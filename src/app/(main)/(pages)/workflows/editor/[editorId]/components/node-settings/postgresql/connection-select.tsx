"use client";

import { ConnectionSelect } from "../connection-select";

export function PostgresConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="PostgreSQL" value={value} onChange={onChange} />;
}
