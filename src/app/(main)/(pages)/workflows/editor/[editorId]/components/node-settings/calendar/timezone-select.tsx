"use client";

import { Label } from "@/components/ui/label";
import { COMMON_TIMEZONES, defaultTimezone, getTimezones } from "@/lib/timezones";

export function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const suggested = defaultTimezone();
  const all = getTimezones();
  const common = Array.from(new Set([...COMMON_TIMEZONES, suggested]));
  const rest = all.filter((zone) => !common.includes(zone));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Time zone</Label>
      <select
        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          {value ? "Select timezone..." : `Select timezone... (${suggested})`}
        </option>
        <optgroup label="Common">
          {common.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </optgroup>
        <optgroup label="All time zones">
          {rest.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </optgroup>
      </select>
      <p className="text-[10px] text-muted-foreground">
        Required when start/end come from the picker. Ignored for values that already include an
        offset, like <code className="bg-muted px-1 rounded">2026-11-20T10:00:00-06:00</code>.
      </p>
    </div>
  );
}
