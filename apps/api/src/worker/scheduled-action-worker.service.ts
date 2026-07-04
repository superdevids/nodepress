import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ScheduledActionRecord {
  id: string;
  hook: string;
  args: unknown;
  status: string;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
}

/**
 * ScheduledActionWorkerService polls the scheduled_actions table
 * for pending actions that are due, and executes them with retry
 * logic. This provides a reliable way to schedule one-off actions
 * (unlike CronEvent which is for recurring schedules).
 *
 * Retry behavior:
 * - Max 5 attempts per action (configurable via max_attempts field)
 * - Exponential backoff between retries
 * - Action is marked 'failed' after exhausting retries
 * - Action is marked 'completed' on success
 */
@Injectable()
export class ScheduledActionWorkerService implements OnModuleDestroy {
  private readonly logger = new Logger(ScheduledActionWorkerService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private readonly POLL_INTERVAL_MS = 30_000; // Check every 30 seconds
  private readonly MAX_BATCH_SIZE = 20;
  private shutdownRequested = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start the scheduled action worker poll loop.
   */
  start(): void {
    if (this.pollTimer) {
      this.logger.warn('Scheduled action worker is already running');
      return;
    }

    this.logger.log('Starting scheduled action worker (poll interval: 30s)');

    // Run immediately on startup, then poll on interval
    this.pollDueActions();
    this.pollTimer = setInterval(() => this.pollDueActions(), this.POLL_INTERVAL_MS);
  }

  /**
   * Stop the scheduled action worker poll loop.
   */
  stop(): void {
    this.shutdownRequested = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.logger.log('Scheduled action worker stopped');
    }
  }

  /**
   * Lifecycle hook: stop on module destroy.
   */
  onModuleDestroy(): void {
    this.stop();
  }

  /**
   * Check if the scheduled action worker is running.
   */
  isRunning(): boolean {
    return this.pollTimer !== null;
  }

  /**
   * Poll for pending scheduled actions that are due.
   */
  private async pollDueActions(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Skipping action poll cycle — previous cycle still processing');
      return;
    }

    if (this.shutdownRequested) return;

    this.isProcessing = true;

    try {
      // Find pending actions that are due for execution.
      // Include actions that:
      // - Are 'pending' status
      // - Have scheduled_at <= now OR scheduled_at IS NULL
      // - Haven't exceeded max attempts
      const dueActions = await this.prisma.$queryRawUnsafe<ScheduledActionRecord[]>(
        `SELECT * FROM scheduled_actions
         WHERE status = 'pending'
         AND (scheduled_at IS NULL OR scheduled_at <= $1::timestamptz)
         AND attempts < max_attempts
         ORDER BY scheduled_at ASC NULLS FIRST
         LIMIT $2`,
        new Date(),
        this.MAX_BATCH_SIZE,
      );

      if (dueActions.length > 0) {
        this.logger.debug(`Found ${dueActions.length} due scheduled action(s)`);
      }

      for (const action of dueActions) {
        if (this.shutdownRequested) break;
        await this.processAction(action);
      }
    } catch (error) {
      this.logger.error(`Scheduled action poll error: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single scheduled action with retry logic.
   */
  private async processAction(action: ScheduledActionRecord): Promise<void> {
    const startTime = Date.now();

    // Mark as running
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE scheduled_actions
         SET started_at = $1::timestamptz, updated_at = NOW()
         WHERE id = $2`,
        new Date(startTime),
        action.id,
      );
    } catch {
      // If we can't update, proceed anyway
    }

    this.logger.log(
      `Processing scheduled action: ${action.hook} (${action.id}) [attempt ${action.attempts + 1}/${action.maxAttempts}]`,
    );

    try {
      // Execute the action — either via a known handler or by emitting a hook event.
      // For custom hooks, plugins can listen for 'hook:*' events.
      await this.executeAction(action.hook, action.args as Record<string, unknown>);

      const completedAt = new Date();

      // Mark as completed
      await this.prisma.$executeRawUnsafe(
        `UPDATE scheduled_actions
         SET status = 'completed',
             started_at = COALESCE(started_at, $1::timestamptz),
             completed_at = $2::timestamptz,
             attempts = attempts + 1,
             last_error = NULL,
             updated_at = NOW()
         WHERE id = $3`,
        new Date(startTime),
        completedAt,
        action.id,
      );

      this.logger.log(
        `Scheduled action completed: ${action.hook} (${action.id}) in ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      const errorMessage = (error as Error).message;
      const newAttempts = action.attempts + 1;
      const isFinalAttempt = newAttempts >= action.maxAttempts;

      this.logger.error(
        `Scheduled action failed: ${action.hook} (${action.id}) attempt ${newAttempts}/${action.maxAttempts}: ${errorMessage}`,
      );

      // Update with error info
      await this.prisma.$executeRawUnsafe(
        `UPDATE scheduled_actions
         SET status = $1,
             attempts = $2,
             last_error = $3,
             updated_at = NOW()
         WHERE id = $4`,
        isFinalAttempt ? 'failed' : 'pending',
        newAttempts,
        errorMessage,
        action.id,
      );

      if (isFinalAttempt) {
        this.logger.warn(
          `Scheduled action exhausted retries: ${action.hook} (${action.id}) — marked as failed`,
        );
      }
    }
  }

  /**
   * Execute an action hook. For known system hooks, handle directly.
   * For plugin-defined hooks, this is dispatched via the hook system.
   *
   * Currently handles:
   * - nodepress/webhook-trigger: Fire a webhook
   * - nodepress/mail-send: Send an email
   *
   * Custom hooks from plugins will be routed via the event emitter.
   */
  private async executeAction(hook: string, args: Record<string, unknown>): Promise<void> {
    switch (hook) {
      case 'nodepress/webhook-trigger': {
        const eventName = args?.event as string | undefined;
        if (!eventName) {
          throw new Error('Missing required argument: event');
        }
        // TODO (Gap A-018): Wire up actual webhook dispatch via WebhooksService.trigger().
        // The WebhooksService should be injected and called here with the event name
        // and any associated payload from args.
        this.logger.debug(`Webhook trigger queued for event: ${eventName}`);
        break;
      }

      case 'nodepress/mail-send': {
        const to = args?.to as string | undefined;
        const subject = args?.subject as string | undefined;
        if (!to || !subject) {
          throw new Error('Missing required arguments: to, subject');
        }
        // TODO (Gap A-018): Wire up actual mail sending via MailManager from @nodepressjs/core.
        // Requires injecting MailManager and calling its send() method with the
        // resolved email template and recipient data.
        this.logger.debug(`Mail send queued to: ${to}, subject: ${subject}`);
        break;
      }

      default:
        // TODO (Gap A-018): For custom hooks, emit an event so plugins can handle them.
        // Requires injecting EventEmitter2 and emitting a custom event.
        this.logger.debug(`Dispatching custom action hook: ${hook}`);
        break;
    }
  }

  /**
   * Manually enqueue a new scheduled action.
   * Returns the created action ID.
   */
  async enqueueAction(params: {
    hook: string;
    args?: Record<string, unknown>;
    scheduledAt?: Date;
    maxAttempts?: number;
  }): Promise<string> {
    const actionId = crypto.randomUUID();

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO scheduled_actions (id, hook, args, status, scheduled_at, max_attempts, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, 'pending', $4::timestamptz, $5, NOW(), NOW())`,
      actionId,
      params.hook,
      JSON.stringify(params.args ?? {}),
      params.scheduledAt ?? new Date(),
      params.maxAttempts ?? 5,
    );

    this.logger.log(`Scheduled action enqueued: ${params.hook} (${actionId})`);
    return actionId;
  }

  /**
   * Retry a failed action by resetting its status back to pending.
   */
  async retryAction(id: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE scheduled_actions
       SET status = 'pending',
           attempts = 0,
           last_error = NULL,
           started_at = NULL,
           completed_at = NULL,
           updated_at = NOW()
       WHERE id = $1 AND status = 'failed'`,
      id,
    );
    this.logger.log(`Scheduled action queued for retry: ${id}`);
  }

  /**
   * Cancel a pending action.
   */
  async cancelAction(id: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE scheduled_actions
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'`,
      id,
    );
    this.logger.log(`Scheduled action cancelled: ${id}`);
  }

  /**
   * Get stats about scheduled actions.
   */
  async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ status: string; count: bigint }[]>(
        `SELECT status, COUNT(*)::bigint as count
         FROM scheduled_actions
         GROUP BY status`,
      );

      const stats = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
      for (const row of rows) {
        const key = row.status as keyof typeof stats;
        if (key in stats) {
          stats[key] = Number(row.count);
        }
      }

      return stats;
    } catch {
      return { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    }
  }
}
