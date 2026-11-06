/**
 * Converts a Unix timestamp (ms or seconds) or null to a YYYY-MM-DD string for <input type="date">
 */
export function timestampToDateInput(ts: number | null | undefined): string {
  if (!ts) return '';
  // Support both seconds and milliseconds timestamps
  const ms = ts < 10000000000 ? ts * 1000 : ts;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts a YYYY-MM-DD string from <input type="date"> to timestamp milliseconds
 */
export function dateInputToTimestamp(dateStr: string): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

/**
 * Formats a Unix timestamp for table display in localized, readable date format
 */
export function formatDate(
  ts: number | null | undefined,
  culture: 'tr-TR' | 'en' = 'tr-TR'
): string {
  if (!ts) return '-';
  const ms = ts < 10000000000 ? ts * 1000 : ts;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '-';

  if (culture === 'tr-TR') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // English standard
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
