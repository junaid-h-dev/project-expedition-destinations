/** `YYYY-MM-DD HH:MM:SS` in UTC — the one timestamp format both engines accept. */
export function toDbTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Normalise whatever the driver returned (Date from mysql2, text from SQLite) to a Date. */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

  // SQLite gives the string back untouched; it is UTC by construction.
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/** Decode a JSON column that MySQL may already have parsed. */
export function fromJsonColumn(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  const parsed: unknown = JSON.parse(value);

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}
