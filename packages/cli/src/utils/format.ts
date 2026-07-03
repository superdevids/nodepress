// ─── Date Formatting ────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

// ─── File Size ──────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${size} ${units[i]}`;
}

// ─── String Helpers ─────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Status Badge ───────────────────────────────────────────────────────────

export function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    PUBLISHED: '\x1b[32m', // green
    DRAFT: '\x1b[33m', // yellow
    PENDING_REVIEW: '\x1b[36m', // cyan
    SCHEDULED: '\x1b[34m', // blue
    TRASHED: '\x1b[31m', // red
    ACTIVE: '\x1b[32m',
    INACTIVE: '\x1b[31m',
    PENDING: '\x1b[33m',
    COMPLETED: '\x1b[32m',
    FAILED: '\x1b[31m',
    RUNNING: '\x1b[36m',
  };
  const reset = '\x1b[0m';

  const color = colors[status] || '\x1b[37m';
  return `${color}${status}${reset}`;
}
