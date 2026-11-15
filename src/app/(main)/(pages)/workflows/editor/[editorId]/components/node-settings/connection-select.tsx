"use client";

import { useConnections } from "@/hooks/use-connections";
import type { ConnectionType } from "@/lib/types";

/**
 * One connection dropdown for every node settings panel. The list is fetched
 * with `?type=` and shared through the useConnections cache.
 */
export function ConnectionSelect({
  type,
  value,
  onChange,
}: {
  type: ConnectionType;
  value: string;
  onChange: (value: string) => void;
}) {
  const { connections, loading, error } = useConnections(type);

  return (
    <select
      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-busy={loading}
    >
      <option value="">
        {loading ? "Loading..." : error ? "Failed to load connections" : "Select connection..."}
      </option>
      {connections.map((connection) => (
        <option key={connection.id} value={connection.id}>
          {connection.name}
        </option>
      ))}
    </select>
  );
}
