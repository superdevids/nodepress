import crypto from "node:crypto";
import type { PrismaClient } from "@nodepress/db";
import { EventEmitter } from "node:events";

export type CronStatus = "active" | "paused" | "failed" | "running";

export interface CronEvent {
  id: string;
  hook: string;
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  status: CronStatus;
  errorCount: number;
  pluginId: string | null;
  description?: string;
}

export interface CronEventFilter {
  status?: CronStatus;
  pluginId?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface CronExecutionResult {
  success: boolean;
  duration: number;
  error?: string;
}

export class CronViewer extends EventEmitter {
  private prisma: PrismaClient;
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private running: Set<string> = new Set();

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async getEvents(filter: CronEventFilter = {}): Promise<{ events: CronEvent[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filter.status);
    }

    if (filter.pluginId) {
      conditions.push(`plugin_id = $${paramIdx++}`);
      params.push(filter.pluginId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const countResult = await this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
        `SELECT COUNT(*)::bigint as total FROM cron_events ${where}`,
        ...params
      );
      const total = Number(countResult[0]?.total || 0);

      const offset = filter.offset || 0;
      const limit = filter.limit || 50;

      const rows = await this.prisma.$queryRawUnsafe<CronEvent[]>(
        `SELECT * FROM cron_events ${where} ORDER BY next_run ASC NULLS LAST LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        ...params,
        limit,
        offset
      );

      return { events: rows, total };
    } catch {
      return { events: [], total: 0 };
    }
  }

  async getEvent(id: string): Promise<CronEvent | null> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<CronEvent[]>(
        'SELECT * FROM cron_events WHERE id = $1',
        id
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  async runNow(id: string): Promise<CronExecutionResult> {
    const event = await this.getEvent(id);
    if (!event) throw new Error(`Cron event ${id} not found`);

    if (this.running.has(id)) {
      throw new Error(`Cron event ${id} is already running`);
    }

    this.running.add(id);
    const start = Date.now();

    try {
      await this.updateStatus(id, "running");
      this.emit("beforeRun", event);

      await this.executeHook(event.hook, event.pluginId);

      const duration = Date.now() - start;
      await this.updateAfterRun(id, true, duration);

      this.emit("afterRun", { ...event, duration, success: true });

      return { success: true, duration };
    } catch (err) {
      const duration = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);
      await this.updateAfterRun(id, false, duration, error);

      this.emit("afterRun", { ...event, duration, success: false, error });

      return { success: false, duration, error };
    } finally {
      this.running.delete(id);
    }
  }

  async pause(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }

    try {
      await this.prisma.$executeRawUnsafe(
        'UPDATE cron_events SET status = $1, updated_at = NOW() WHERE id = $2',
        "paused",
        id
      );
    } catch {
    }
  }

  async resume(id: string): Promise<void> {
    const event = await this.getEvent(id);
    if (!event) throw new Error(`Cron event ${id} not found`);

    await this.updateStatus(id, "active");
    this.scheduleEvent(event);
  }

  async cancel(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }

    try {
      await this.prisma.$executeRawUnsafe(
        'DELETE FROM cron_events WHERE id = $1',
        id
      );
    } catch {
    }
  }

  async retryFailed(id: string): Promise<CronExecutionResult> {
    return this.runNow(id);
  }

  async register(hook: string, schedule: string, pluginId?: string, description?: string): Promise<CronEvent> {
    const id = crypto.randomUUID();
    const nextRun = this.calculateNextRun(schedule);

    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO cron_events (id, hook, schedule, next_run, status, error_count, plugin_id, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        id, hook, schedule, nextRun, "active", 0, pluginId || null, description || null
      );
    } catch {
    }

    const event: CronEvent = {
      id,
      hook,
      schedule,
      lastRun: null,
      nextRun,
      status: "active",
      errorCount: 0,
      pluginId: pluginId || null,
      description,
    };

    this.scheduleEvent(event);
    this.emit("registered", event);

    return event;
  }

  async initialize(): Promise<void> {
    try {
      const { events } = await this.getEvents({ status: "active" });
      for (const event of events) {
        this.scheduleEvent(event);
      }
    } catch {
    }
  }

  async shutdown(): Promise<void> {
    for (const [id, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.running.clear();
  }

  getRunningJobs(): string[] {
    return Array.from(this.running);
  }

  getStats(): { total: number; active: number; failed: number; paused: number; running: number } {
    return {
      total: this.timers.size + this.running.size,
      active: this.timers.size,
      failed: 0,
      paused: 0,
      running: this.running.size,
    };
  }

  private scheduleEvent(event: CronEvent): void {
    if (this.timers.has(event.id)) return;

    const now = Date.now();
    const nextTime = event.nextRun ? new Date(event.nextRun).getTime() : now;
    const delay = Math.max(0, nextTime - now);

    const timer = setTimeout(async () => {
      await this.runNow(event.id);
      this.scheduleNext(event.id);
    }, delay);

    this.timers.set(event.id, timer);
  }

  private async scheduleNext(id: string): Promise<void> {
    const event = await this.getEvent(id);
    if (!event || event.status !== "active") return;

    const nextRun = this.calculateNextRun(event.schedule);
    if (!nextRun) return;

    try {
      await this.prisma.$executeRawUnsafe(
        'UPDATE cron_events SET next_run = $1, updated_at = NOW() WHERE id = $2',
        nextRun,
        id
      );
    } catch {
    }

    const delay = Math.max(0, nextRun.getTime() - Date.now());
    const timer = setTimeout(async () => {
      await this.runNow(id);
      this.scheduleNext(id);
    }, delay);

    this.timers.set(id, timer);
  }

  private async updateStatus(id: string, status: CronStatus): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        'UPDATE cron_events SET status = $1, updated_at = NOW() WHERE id = $2',
        status,
        id
      );
    } catch {
    }
  }

  private async updateAfterRun(id: string, success: boolean, duration: number, error?: string): Promise<void> {
    try {
      if (success) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE cron_events
           SET status = 'active', last_run = NOW(), error_count = 0, updated_at = NOW()
           WHERE id = $1`,
          id
        );
      } else {
        await this.prisma.$executeRawUnsafe(
          `UPDATE cron_events
           SET status = CASE WHEN error_count >= 5 THEN 'failed' ELSE 'active' END,
               last_run = NOW(), error_count = error_count + 1, updated_at = NOW()
           WHERE id = $1`,
          id
        );
      }
    } catch {
    }
  }

  private async executeHook(hook: string, _pluginId: string | null): Promise<void> {
    this.emit(`hook:${hook}`);
  }

  private calculateNextRun(cronExpression: string): Date | null {
    try {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5 && parts.length !== 6) return null;

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      const now = new Date();
      const next = new Date(now);
      next.setSeconds(0);
      next.setMilliseconds(0);

      if (minute !== "*") {
        if (minute.startsWith("*/")) {
          const interval = parseInt(minute.slice(2), 10);
          if (interval > 0) {
            const currentMinute = next.getMinutes();
            const nextMinute = Math.ceil(currentMinute / interval) * interval;
            if (nextMinute >= 60) {
              next.setHours(next.getHours() + 1);
              next.setMinutes(0);
            } else {
              next.setMinutes(nextMinute);
            }
          }
        } else {
          const m = parseInt(minute, 10);
          if (next.getMinutes() >= m) next.setHours(next.getHours() + 1);
          next.setMinutes(m);
        }
      }

      if (hour !== "*") {
        const h = parseInt(hour, 10);
        if (next.getHours() > h || (next.getHours() === h && next.getMinutes() > parseInt(minute, 10) || 0)) {
          next.setDate(next.getDate() + 1);
        }
        next.setHours(h);
      }

      if (next.getTime() <= now.getTime()) {
        next.setMinutes(next.getMinutes() + 1);
      }

      return next;
    } catch {
      return new Date(Date.now() + 60000);
    }
  }
}
