import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CronWorkerService } from './cron-worker.service';
import { ScheduledActionWorkerService } from './scheduled-action-worker.service';

/**
 * WorkerService is the top-level orchestrator for all background workers.
 * It starts/stops the cron event worker and the scheduled action worker,
 * providing a single lifecycle hook for the application module.
 *
 * This replaces the legacy in-memory scheduler with a database-backed
 * polling worker that persists scheduling state across restarts.
 */
@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly cronWorker: CronWorkerService,
    private readonly scheduledActionWorker: ScheduledActionWorkerService,
  ) {}

  /**
   * On module init, start all background workers.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing background workers...');

    // Start the cron event worker (polls every 60s, registers default jobs on first run)
    this.cronWorker.start();

    // Start the scheduled action worker (polls every 30s)
    this.scheduledActionWorker.start();

    this.logger.log('All background workers started');
  }

  /**
   * On module destroy, stop all background workers.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down background workers...');
    this.cronWorker.stop();
    this.scheduledActionWorker.stop();
    this.logger.log('All background workers stopped');
  }

  /**
   * Get the status of all workers.
   */
  getStatus(): {
    cronWorker: { running: boolean };
    scheduledActionWorker: { running: boolean };
  } {
    return {
      cronWorker: { running: this.cronWorker.isRunning() },
      scheduledActionWorker: { running: this.scheduledActionWorker.isRunning() },
    };
  }
}
