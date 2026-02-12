/**
 * Returns a human-readable relative time string like:
 * "Just now", "5 min ago", "2 hours ago", "3 days ago", "2 weeks ago", "Jan 15, 2025"
 * Falls back to formatted date for anything older than 3 months.
 *
 * @param dateString  ISO date string
 * @param locale      BCP-47 locale for date fallback formatting (default: 'en-US')
 */
export function timeAgo(dateString: string, locale: string = 'en-US'): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();

  // Future dates or invalid — show formatted date
  if (diffMs < 0 || isNaN(diffMs)) {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 3) return `${months} months ago`;

  // Older than ~3 months → show full date
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}
