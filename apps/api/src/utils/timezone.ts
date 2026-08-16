/**
 * Validates an IANA timezone name (e.g. "America/New_York",
 * "Asia/Kolkata", "UTC"). Uses Intl's own timezone resolution rather
 * than a hardcoded/fetched list, so it accepts recognized aliases
 * without needing to keep a list in sync with the ICU data Node ships.
 */
export function isValidTimezone(
  value: string
): boolean {
  if (!value) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value
    });

    return true;
  } catch {
    return false;
  }
}
