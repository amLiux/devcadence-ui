"use client";

import { ConnectionSelect } from "../connection-select";

export function GoogleConnectionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <ConnectionSelect type="Google" value={value} onChange={onChange} />;
}
