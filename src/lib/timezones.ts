/**
 * Full IANA time zone list without shipping a 400-line constant.
 * `Intl.supportedValuesOf` is available in modern browsers and Node 18+;
 * the fallback covers the common ones if it is missing.
 */
export const FALLBACK_TIMEZONES = [
  "UTC",
  "America/Costa_Rica",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/** Time zones shown first, because they cover most users of a self-hosted instance. */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/Costa_Rica",
  "America/Mexico_City",
  "America/Bogota",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

let cached: string[] | null = null;

/** All IANA time zones, cached per process. */
export function getTimezones(): string[] {
  if (cached) return cached;

  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    cached =
      supported && supported.length > 0
        ? Array.from(new Set(["UTC", ...supported]))
        : [...FALLBACK_TIMEZONES];
  } catch {
    cached = [...FALLBACK_TIMEZONES];
  }
  return cached;
}

/** The browser/process zone, used as a hint when the node has none. */
export function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
