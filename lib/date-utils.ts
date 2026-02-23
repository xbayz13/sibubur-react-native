/**
 * Get date string (YYYY-MM-DD) in local timezone.
 * Avoids UTC conversion issues (e.g. 8 PM PST incorrectly showing next day).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
