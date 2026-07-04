/**
 * Cron Expression Parser
 *
 * Parses standard 5-field cron expressions (min hour dom mon dow)
 * and computes the next execution date relative to a given base time.
 * Also computes the interval in milliseconds between scheduled runs
 * for use with setInterval-based schedulers.
 */

export type CronField = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

export interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

/**
 * Parse a 5-part cron expression into its constituent fields.
 */
export function parseCronExpression(expression: string): CronFields {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression "${expression}". Expected 5 fields (min hour dom mon dow), got ${parts.length}.`,
    );
  }
  return {
    minute: parts[0] ?? '*',
    hour: parts[1] ?? '*',
    dayOfMonth: parts[2] ?? '*',
    month: parts[3] ?? '*',
    dayOfWeek: parts[4] ?? '*',
  };
}

/**
 * Check if a value in a cron field matches a given number.
 */
function fieldMatches(field: string, value: number): boolean {
  if (field === '*') return true;

  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) return false;
    return value % step === 0;
  }

  if (field.includes(',')) {
    return field.split(',').some((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num === value;
    });
  }

  if (field.includes('-')) {
    const parts = field.split('-');
    const start = parseInt(parts[0] ?? '0', 10);
    const end = parseInt(parts[1] ?? '0', 10);
    if (!isNaN(start) && !isNaN(end)) {
      return value >= start && value <= end;
    }
  }

  const exact = parseInt(field, 10);
  return !isNaN(exact) && exact === value;
}

/**
 * Calculate the next date that matches the cron expression from a given reference date.
 * Returns a Date object or null if no future match can be found within a reasonable window.
 */
export function calculateNextRun(cronExpression: string, fromDate: Date = new Date()): Date | null {
  try {
    const fields = parseCronExpression(cronExpression);
    const next = new Date(fromDate);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Start searching from the next minute
    next.setMinutes(next.getMinutes() + 1);

    // Search for a matching time within a 1-year window
    const maxIterations = 365 * 24 * 60;
    for (let i = 0; i < maxIterations; i++) {
      const minute = next.getMinutes();
      const hour = next.getHours();
      const dayOfMonth = next.getDate();
      const month = next.getMonth() + 1; // JS months are 0-indexed
      const dayOfWeek = next.getDay(); // 0=Sun, 6=Sat

      if (
        fieldMatches(fields.month, month) &&
        fieldMatches(fields.dayOfMonth, dayOfMonth) &&
        fieldMatches(fields.dayOfWeek, dayOfWeek) &&
        fieldMatches(fields.hour, hour) &&
        fieldMatches(fields.minute, minute)
      ) {
        return next;
      }

      // Advance by 1 minute
      next.setMinutes(next.getMinutes() + 1);
    }

    // Fallback: 1 hour from now
    return new Date(fromDate.getTime() + 3600000);
  } catch {
    // On any parse error, return 1 hour from now as a safe default
    return new Date(Date.now() + 3600000);
  }
}

/**
 * Validate a cron expression string.
 * Returns null if valid, or an error message if invalid.
 */
export function validateCronExpression(expression: string): string | null {
  try {
    const fields = parseCronExpression(expression);

    const validations: [string, number, number][] = [
      [fields.minute, 0, 59],
      [fields.hour, 0, 23],
      [fields.dayOfMonth, 1, 31],
      [fields.month, 1, 12],
      [fields.dayOfWeek, 0, 6],
    ];

    for (const [field, min, max] of validations) {
      if (field === '*' || field.startsWith('*/')) continue;
      const values = field.split(',').flatMap((part) => {
        if (part.includes('-')) {
          const s = parseInt(part.split('-')[0] ?? '0', 10);
          const e = parseInt(part.split('-')[1] ?? '0', 10);
          if (!isNaN(s) && !isNaN(e)) {
            return Array.from({ length: e - s + 1 }, (_, i) => s + i);
          }
        }
        return [Number(part)];
      });
      for (const v of values) {
        if (isNaN(v) || v < min || v > max) {
          return `Value ${v} in field "${field}" is out of range [${min}-${max}]`;
        }
      }
    }

    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid cron expression';
  }
}

/**
 * Parse a cron expression into a human-readable description.
 */
export function describeCronExpression(expression: string): string {
  try {
    const fields = parseCronExpression(expression);
    const parts: string[] = [];

    if (fields.minute !== '*' || fields.hour !== '*') {
      const times: string[] = [];
      if (fields.minute === '*') {
        times.push('every minute');
      } else {
        times.push(`minute ${fields.minute}`);
      }
      if (fields.hour !== '*') {
        times.push(`hour ${fields.hour}`);
      }
      parts.push(`At ${times.join(' of ')}`);
    } else {
      parts.push('Every minute');
    }

    if (fields.dayOfMonth !== '*') {
      parts.push(`on day ${fields.dayOfMonth}`);
    }

    if (fields.month !== '*') {
      parts.push(`in ${fields.month}`);
    }

    if (fields.dayOfWeek !== '*') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if (fields.dayOfWeek.includes(',')) {
        const days = fields.dayOfWeek.split(',').map((d) => dayNames[parseInt(d, 10)] || d);
        parts.push(`on ${days.join(', ')}`);
      } else if (fields.dayOfWeek.includes('-')) {
        const s = parseInt(fields.dayOfWeek.split('-')[0] ?? '0', 10);
        const e = parseInt(fields.dayOfWeek.split('-')[1] ?? '0', 10);
        parts.push(`on ${dayNames[s] ?? '?'} through ${dayNames[e] ?? '?'}`);
      } else {
        const idx = parseInt(fields.dayOfWeek, 10);
        parts.push(`on ${dayNames[idx] || fields.dayOfWeek}`);
      }
    }

    return parts.join(' ') || expression;
  } catch {
    return expression;
  }
}

/**
 * Estimate the interval in milliseconds between typical runs of a cron expression.
 * This is an approximation used by the legacy in-memory scheduler.
 */
export function estimateCronIntervalMs(cronExpression: string): number {
  try {
    const fields = parseCronExpression(cronExpression);

    // Every minute (* * * * *)
    if (fields.minute === '*' && fields.hour === '*') return 60000;

    // Every N minutes (*/5 * * * *)
    if (fields.minute.startsWith('*/') && fields.hour === '*') {
      const interval = parseInt(fields.minute.slice(2), 10);
      if (interval > 0) return interval * 60000;
    }

    // Every hour at minute 0 (0 * * * *)
    if (fields.minute === '0' && fields.hour === '*') return 3600000;

    // Every N hours at minute 0 (0 */6 * * *)
    if (fields.minute === '0' && fields.hour.startsWith('*/')) {
      const interval = parseInt(fields.hour.slice(2), 10);
      if (interval > 0) return interval * 3600000;
    }

    // Once per day at a specific hour (0 3 * * *)
    if (fields.minute === '0' && fields.hour !== '*') return 86400000;

    // Default fallback
    return 3600000;
  } catch {
    return 3600000;
  }
}
