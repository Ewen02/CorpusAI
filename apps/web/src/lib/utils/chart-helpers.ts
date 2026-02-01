/**
 * Format a date string to short format (e.g., "15 janv.")
 */
export function formatDateShort(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format a date string to day only (e.g., "15")
 */
export function formatDateDay(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric' });
}

/**
 * Format a date string to long format (e.g., "mercredi 15 janvier")
 */
export function formatDateLong(value: string | number): string {
  return new Date(String(value)).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
