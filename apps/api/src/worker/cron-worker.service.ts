import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CoreJobsService } from './core-jobs.service';
import { calculateNextRun } from '@nodepressjs/core';

export interface CronEventRecord {
  id: string;
  hook: string;
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  status: string;
  errorCount: number;
  pluginId: string | null;
  description: string | null;
}

/**
 * CronWorkerService polls the cron_events table every 60 seconds
 * for due events and executes them via the CoreJobsService or
 * by emitting hook events for plugin-defined cron hooks.
 *
 * This is the database-backed worker that replaces the legacy
 * in-memory scheduler in CronViewer. It provides:
 * - Persistent scheduling across restarts
 * - Error tracking per event
 * - Graceful handling of missed runs
 */
@Injectable()
export class CronWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(CronWorkerService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private readonly POLL_INTERVAL_MS = 60_000; // Check every 60 seconds
  private readonly MAX_ERRORS_BEFORE_FAIL = 10;
  private shutdownRequested = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreJobs: CoreJobsService,
  ) {}

  /**
   * Start the cron worker poll loop.
   */
  start(): void {
    if (this.pollTimer) {
      this.logger.warn('Cron worker is already running');
      return;
    }

    this.logger.log('Starting cron worker (poll interval: 60s)');

    // Register default jobs on first start
    this.registerDefaults()
      .then(() => {
        // Run immediately on startup, then poll on interval
        this.pollDueEvents();
        this.pollTimer = setInterval(() => this.pollDueEvents(), this.POLL_INTERVAL_MS);
      })
      .catch((err) => {
        this.logger.error(`Failed to register default cron jobs: ${(err as Error).message}`);
        // Still start polling even if defaults fail
        this.pollTimer = setInterval(() => this.pollDueEvents(), this.POLL_INTERVAL_MS);
      });
  }

  /**
   * Stop the cron worker poll loop.
   */
  stop(): void {
    this.shutdownRequested = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.logger.log('Cron worker stopped');
    }
  }

  /**
   * Lifecycle hook: stop on module destroy.
   */
  onModuleDestroy(): void {
    this.stop();
  }

  /**
   * Check if the cron worker is currently running.
   */
  isRunning(): boolean {
    return this.pollTimer !== null;
  }

  /**
   * Register default cron jobs if they don't already exist.
   */
  private async registerDefaults(): Promise<void> {
    await this.coreJobs.registerDefaultJobs();

    // Also register the every-minute scheduled publishing job
    const existingPublish = await this.prisma.cronEvent.findFirst({
      where: { hook: 'nodepress/scheduled-publishing' },
    });

    if (!existingPublish) {
      await this.prisma.cronEvent.create({
        data: {
          hook: 'nodepress/scheduled-publishing',
          schedule: '* * * * *',
          status: 'active',
          description: 'Publish scheduled content entries every minute',
          errorCount: 0,
        },
      });
      this.logger.log('Registered default cron job: nodepress/scheduled-publishing');
    }
  }

  /**
   * Poll for due cron events and execute them.
   */
  private async pollDueEvents(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Skipping poll cycle — previous cycle still processing');
      return;
    }

    if (this.shutdownRequested) return;

    this.isProcessing = true;

    try {
      const now = new Date();

      // Find all active events that are due (nextRun <= now OR nextRun is null)
      // Use raw SQL for maximum compatibility
      const dueEvents = await this.prisma.$queryRawUnsafe<CronEventRecord[]>(
        `SELECT * FROM cron_events
         WHERE status = 'active'
         AND (next_run IS NULL OR next_run <= $1::timestamptz)
         ORDER BY next_run ASC NULLS FIRST
         LIMIT 50`,
        now,
      );

      if (dueEvents.length > 0) {
        this.logger.debug(`Found ${dueEvents.length} due cron event(s)`);
      }

      for (const event of dueEvents) {
        if (this.shutdownRequested) break;
        await this.executeCronEvent(event);
      }
    } catch (error) {
      this.logger.error(`Cron poll cycle error: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single cron event and update its tracking fields.
   */
  private async executeCronEvent(event: CronEventRecord): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Executing cron event: ${event.hook} (${event.id})`);

    try {
      // Calculate next run BEFORE execution so we don't lose it
      const nextRun = calculateNextRun(event.schedule);

      // Execute the hook
      await this.coreJobs.executeByHook(event.hook);

      const duration = Date.now() - startTime;

      // Update on success
      await this.prisma.$executeRawUnsafe(
        `UPDATE cron_events
         SET last_run = $1::timestamptz,
             next_run = $2::timestamptz,
             error_count = 0,
             updated_at = NOW()
         WHERE id = $3`,
        new Date(startTime),
        nextRun,
        event.id,
      );

      this.logger.log(`Cron event completed: ${event.hook} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;

      this.logger.error(`Cron event failed: ${event.hook} — ${errorMessage} (${duration}ms)`);

      // Increment error count, mark as failed if exceeded threshold
      const newErrorCount = event.errorCount + 1;
      const newStatus = newErrorCount >= this.MAX_ERRORS_BEFORE_FAIL ? 'failed' : 'active';

      await this.prisma.$executeRawUnsafe(
        `UPDATE cron_events
         SET last_run = $1::timestamptz,
             next_run = $2::timestamptz,
             error_count = $3,
             status = $4,
             updated_at = NOW()
         WHERE id = $5`,
        new Date(startTime),
        calculateNextRun(event.schedule),
        newErrorCount,
        newStatus,
        event.id,
      );

      if (newStatus === 'failed') {
        this.logger.warn(
          `Cron event marked as failed after ${newErrorCount} errors: ${event.hook}`,
        );
      }
    }
  }

  /**
   * Immediately execute a specific cron event by ID (for manual/on-demand runs).
   */
  async runEventById(id: string): Promise<{ success: boolean; error?: string; duration: number }> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<CronEventRecord[]>(
        'SELECT * FROM cron_events WHERE id = $1',
        id,
      );

      if (rows.length === 0) {
        return { success: false, error: 'Cron event not found', duration: 0 };
      }

      await this.executeCronEvent(rows[0]!);
      return { success: true, duration: 0 };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        duration: 0,
      };
    }
  }

  /**
   * Get the count of pending (due) cron events.
   */
  async getPendingCount(): Promise<number> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count FROM cron_events
         WHERE status = 'active'
         AND (next_run IS NULL OR next_run <= NOW())`,
      );
      return Number(rows[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }
}
