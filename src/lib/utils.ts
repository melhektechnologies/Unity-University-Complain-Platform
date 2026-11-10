import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 * Uses clsx for conditional logic and tailwind-merge to deduplicate/override.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date/time string into a human-readable locale string.
 * Defaults to Ethiopian/East Africa locale patterns.
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ET', options);
}

/**
 * Format a date/time string into a short relative string (e.g. "2 days ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a snake_case or kebab-case status string to Title Case with spaces.
 * e.g. "under_review" → "Under Review"
 */
export function formatStatus(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Truncate a string at the given character limit, appending ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Mask a tracking reference for partial display (e.g. in logs/notifications).
 * Shows first 3 and last 3 characters only.
 * e.g. "USS-2024-ABCDEF" → "USS...DEF"
 */
export function maskReference(ref: string): string {
  if (ref.length <= 6) return '***';
  return ref.slice(0, 3) + '...' + ref.slice(-3);
}

