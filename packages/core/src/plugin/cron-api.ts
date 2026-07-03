import type { PrismaClient } from "@nodepressjs/db";
import { HookRegistry } from "./hook-registry.js";

export interface CronRegistration {
  slug: string;
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  description?: string;
}

export interface CronStatus {
  pluginId: string;
  jobName: string;
  cronExpression: string;
  lastRun: Date | null;
  status: "active" | "paused" | "error";
  nextRun: Date | null;
}

export class CronApi {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private jobs = new Map<string, CronRegistration>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(prisma: PrismaClient, hooks: HookRegistry) {
    this.prisma = prisma;
    this.hooks = hooks;
    this.ensureTrackingTable();
  }

  registerCron(slug: string, def: Omit<CronRegistration, "slug">): void {
    const key = `${slug}.${def.name}`;
    if (this.jobs.has(key)) {
      throw new Error(`Cron job "${key}" is already registered.`);
    }
    this.jobs.set(key, { ...def, slug });
  }

  unregisterCron(slug: string, name: string): void {
    const key = `${slug}.${name}`;
    this.jobs.delete(key);
    this.stopJob(key);
  }

  async startJob(slug: string, name: string): Promise<void> {
    const key = `${slug}.${name}`;
    const job = this.jobs.get(key);
    if (!job) throw new Error(`Cron job "${key}" not found.`);

    const ms = this.cronToMs(job.schedule);
    if (ms <= 0) {
      const nextDate = this.cronToNextDate(job.schedule);
      if (nextDate) {
        const delay = nextDate.getTime() - Date.now();
        if (delay > 0) {
          const timeout = setTimeout(() => this.executeJob(job), delay);
          this.timeouts.set(key, timeout);
        }
      }
      return;
    }

    const interval = setInterval(() => this.executeJob(job), ms);
    this.intervals.set(key, interval);

    await this.upsertCronRecord(slug, name, job.schedule, "active");
  }

  stopJob(key: string): void {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  async startAll(slug: string): Promise<void> {
    for (const [jobKey, job] of this.jobs) {
      if (job.slug === slug) {
        await this.startJob(slug, job.name);
      }
    }
  }

  stopAll(slug: string): void {
    for (const [jobKey, job] of this.jobs) {
      if (job.slug === slug) {
        this.stopJob(jobKey);
      }
    }
  }

  async getStatus(slug: string): Promise<CronStatus[]> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        { plugin_id: string; job_name: string; cron_expression: string; last_run: Date | null; status: string; next_run: Date | null }[]
      >(
        `SELECT plugin_id, job_name, cron_expression, last_run, status, next_run
         FROM _plugin_cron_jobs WHERE plugin_id = $1`,
        slug
      );
      return rows.map((r) => ({
        pluginId: r.plugin_id,
        jobName: r.job_name,
        cronExpression: r.cron_expression,
        lastRun: r.last_run,
        status: r.status as "active" | "paused" | "error",
        nextRun: r.next_run,
      }));
    } catch {
      return [];
    }
  }

  getJobs(slug?: string): CronRegistration[] {
    const all = Array.from(this.jobs.values());
    return slug ? all.filter((j) => j.slug === slug) : all;
  }

  private async executeJob(job: CronRegistration): Promise<void> {
    const jobKey = `${job.slug}.${job.name}`;
    try {
      await this.hooks.doAction("plugin_cron_before_run", job.slug, job.name);
      await job.handler();
      await this.updateCronAfterRun(job.slug, job.name, "active");
      await this.hooks.doAction("plugin_cron_after_run", job.slug, job.name);
    } catch (err) {
      console.error(`[CronApi] Job "${jobKey}" failed:`, err);
      await this.updateCronAfterRun(job.slug, job.name, "error");
    }
  }

  private async upsertCronRecord(slug: string, jobName: string, expression: string, status: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO _plugin_cron_jobs (plugin_id, job_name, cron_expression, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (plugin_id, job_name)
         DO UPDATE SET cron_expression = $3, status = $4`,
        slug,
        jobName,
        expression,
        status
      );
    } catch {
      // ignore
    }
  }

  private async updateCronAfterRun(slug: string, jobName: string, status: string): Promise<void> {
    try {
      const registration = this.jobs.get(`${slug}.${jobName}`);
      const nextRun = registration ? this.cronToNextDate(registration.schedule) : null;
      await this.prisma.$executeRawUnsafe(
        `UPDATE _plugin_cron_jobs SET last_run = NOW(), status = $3, next_run = $4 WHERE plugin_id = $1 AND job_name = $2`,
        slug,
        jobName,
        status,
        nextRun
      );
    } catch {
      // ignore
    }
  }

  private cronToMs(expression: string): number {
    if (expression.startsWith("*/")) {
      const every = parseInt(expression.slice(2), 10);
      return every * 1000;
    }
    return -1;
  }

  private cronToNextDate(expression: string): Date | null {
    if (!expression || expression.startsWith("*/")) {
      const every = parseInt(expression?.slice(2) || "0", 10);
      return every > 0 ? new Date(Date.now() + every * 1000) : new Date(Date.now() + 60000);
    }

    const parts = expression.split(" ");
    if (parts.length !== 5) return null;

    const minuteStr = parts[0] ?? "0";
    const hourStr = parts[1] ?? "0";
    const dayOfMonthStr = parts[2];
    const monthStr = parts[3];

    const minute = parseInt(minuteStr, 10);
    const hour = parseInt(hourStr, 10);
    const dayOfMonth = dayOfMonthStr === "*" || !dayOfMonthStr ? null : parseInt(dayOfMonthStr, 10);
    const month = monthStr === "*" || !monthStr ? null : parseInt(monthStr, 10);

    const now = new Date();
    const candidate = new Date(now.getTime() + 60000);
    candidate.setSeconds(0);
    candidate.setMilliseconds(0);

    if (dayOfMonth !== null && !isNaN(dayOfMonth)) candidate.setDate(dayOfMonth);
    if (month !== null && !isNaN(month)) candidate.setMonth(month - 1);
    candidate.setHours(isNaN(hour) ? 0 : hour);
    candidate.setMinutes(isNaN(minute) ? 0 : minute);

    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1);
    }

    return candidate;
  }

  private async ensureTrackingTable(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _plugin_cron_jobs (
          id SERIAL PRIMARY KEY,
          plugin_id VARCHAR(255) NOT NULL,
          job_name VARCHAR(255) NOT NULL,
          cron_expression VARCHAR(255) NOT NULL,
          last_run TIMESTAMP,
          next_run TIMESTAMP,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(plugin_id, job_name)
        )
      `);
    } catch {
      // ignore
    }
  }
}
