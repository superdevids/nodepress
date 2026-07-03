/**
 * Cron API for plugins.
 * Allows plugins to register scheduled tasks backed by BullMQ.
 */

export type CronSchedule =
  | { type: "interval"; seconds: number }
  | { type: "cron"; expression: string }
  | { type: "specific"; date: Date };

export interface CronJob {
  slug: string;
  name: string;
  description?: string;
  schedule: CronSchedule;
  handler: () => Promise<void>;
}

const registeredCronJobs = new Map<string, CronJob>();

/**
 * Register a cron job.
 */
export function registerCron(job: CronJob): void {
  if (registeredCronJobs.has(job.slug)) {
    throw new Error(`Cron job "${job.slug}" is already registered.`);
  }
  registeredCronJobs.set(job.slug, job);
}

/**
 * Get all registered cron jobs.
 */
export function getRegisteredCronJobs(): CronJob[] {
  return Array.from(registeredCronJobs.values());
}

/**
 * Get a cron job by slug.
 */
export function getCronJob(slug: string): CronJob | undefined {
  return registeredCronJobs.get(slug);
}
