import type { PrismaClient } from "@nodepress/db";
import { EventEmitter } from "node:events";

export interface ScheduledJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  description?: string;
  enabled?: boolean;
}

export interface JobExecution {
  name: string;
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  error?: string;
  duration: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export class SchedulerService extends EventEmitter {
  private prisma: PrismaClient;
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private runningJobs: Set<string> = new Set();
  private executionHistory: JobExecution[] = [];
  private maxHistory: number = 100;
  private initialized: boolean = false;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  registerJob(job: ScheduledJob): void {
    if (this.jobs.has(job.name)) {
      throw new Error(`Job "${job.name}" is already registered`);
    }
    this.jobs.set(job.name, { ...job, enabled: job.enabled ?? true });
  }

  unregisterJob(name: string): void {
    this.stopJob(name);
    this.jobs.delete(name);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.registerCoreJobs();

    for (const [name, job] of this.jobs) {
      if (job.enabled) {
        this.startJob(name);
      }
    }

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    for (const [name] of this.timers) {
      this.stopJob(name);
    }
    this.timers.clear();
    this.runningJobs.clear();
    this.initialized = false;
  }

  async executeJob(name: string): Promise<JobExecution> {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job "${name}" not found`);

    if (this.runningJobs.has(name)) {
      throw new Error(`Job "${name}" is already running`);
    }

    const startedAt = new Date();
    this.runningJobs.add(name);

    const execution: JobExecution = {
      name,
      startedAt,
      success: false,
      duration: 0,
    };

    try {
      this.emit("jobStart", { name, startedAt });
      await job.handler();

      execution.success = true;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startedAt.getTime();

      this.emit("jobComplete", execution);
    } catch (err) {
      execution.success = false;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startedAt.getTime();
      execution.error = err instanceof Error ? err.message : String(err);

      this.emit("jobFailed", execution);
    } finally {
      this.runningJobs.delete(name);
      this.executionHistory.unshift(execution);

      if (this.executionHistory.length > this.maxHistory) {
        this.executionHistory.pop();
      }
    }

    return execution;
  }

  getJobs(): (ScheduledJob & { running: boolean })[] {
    return Array.from(this.jobs.values()).map((j) => ({
      ...j,
      running: this.runningJobs.has(j.name),
    }));
  }

  getJob(name: string): (ScheduledJob & { running: boolean }) | undefined {
    const job = this.jobs.get(name);
    if (!job) return undefined;
    return { ...job, running: this.runningJobs.has(name) };
  }

  getExecutionHistory(name?: string): JobExecution[] {
    if (name) {
      return this.executionHistory.filter((e) => e.name === name);
    }
    return [...this.executionHistory];
  }

  enableJob(name: string): void {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job "${name}" not found`);
    job.enabled = true;
    this.startJob(name);
  }

  disableJob(name: string): void {
    const job = this.jobs.get(name);
    if (!job) throw new Error(`Job "${name}" not found`);
    job.enabled = false;
    this.stopJob(name);
  }

  getQueueStats(): QueueStats {
    return {
      waiting: 0,
      active: this.runningJobs.size,
      completed: this.executionHistory.filter((e) => e.success).length,
      failed: this.executionHistory.filter((e) => !e.success).length,
      delayed: 0,
    };
  }

  isRunning(name: string): boolean {
    return this.runningJobs.has(name);
  }

  private startJob(name: string): void {
    if (this.timers.has(name)) return;

    const job = this.jobs.get(name);
    if (!job) return;

    const interval = this.parseCronToMs(job.schedule);

    const runJob = async () => {
      try {
        await this.executeJob(name);
      } catch {
      }
    };

    const timer = setInterval(runJob, interval);
    this.timers.set(name, timer);

    setTimeout(runJob, 5000);
  }

  private stopJob(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  private registerCoreJobs(): void {
    this.registerJob({
      name: "check-plugin-updates",
      schedule: "0 */6 * * *",
      description: "Check for plugin updates every 6 hours",
      handler: async () => {
        this.emit("job:check-plugin-updates");
      },
    });

    this.registerJob({
      name: "check-theme-updates",
      schedule: "0 */6 * * *",
      description: "Check for theme updates every 6 hours",
      handler: async () => {
        this.emit("job:check-theme-updates");
      },
    });

    this.registerJob({
      name: "cleanup-database",
      schedule: "0 3 * * *",
      description: "Run database cleanup daily at 3am",
      handler: async () => {
        this.emit("job:cleanup-database");
      },
    });

    this.registerJob({
      name: "purge-trashed-content",
      schedule: "0 4 * * *",
      description: "Purge trashed content daily at 4am",
      handler: async () => {
        this.emit("job:purge-trashed-content");
      },
    });

    this.registerJob({
      name: "send-email-digests",
      schedule: "0 8 * * 1",
      description: "Send weekly email digests on Monday",
      handler: async () => {
        this.emit("job:send-email-digests");
      },
    });

    this.registerJob({
      name: "check-security-updates",
      schedule: "0 */12 * * *",
      description: "Check for security updates every 12 hours",
      handler: async () => {
        this.emit("job:check-security-updates");
      },
    });

    this.registerJob({
      name: "send-scheduled-content",
      schedule: "* * * * *",
      description: "Publish scheduled content every minute",
      handler: async () => {
        try {
          await this.prisma.$executeRawUnsafe(
            `UPDATE content_entries
             SET status = 'PUBLISHED', published_at = NOW()
             WHERE status = 'SCHEDULED'
             AND published_at <= NOW()`
          );
        } catch {
        }
      },
    });
  }

  private parseCronToMs(cronExpression: string): number {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) return 3600000;

    const [minute, hour, _dayOfMonth, _month, _dayOfWeek] = parts;

    if (minute === "*" && hour === "*") return 60000;
    if (minute.startsWith("*/")) {
      const interval = parseInt(minute.slice(2), 10);
      if (interval > 0) return interval * 60000;
    }
    if (minute === "0" && hour === "*") return 3600000;
    if (minute === "0" && hour.startsWith("*/")) {
      const interval = parseInt(hour.slice(2), 10);
      return interval * 3600000;
    }

    if (minute === "0" && hour !== "*") return 86400000;

    return 3600000;
  }
}
