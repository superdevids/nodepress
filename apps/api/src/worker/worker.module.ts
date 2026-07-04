import { Module, Global } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { CronWorkerService } from './cron-worker.service';
import { ScheduledActionWorkerService } from './scheduled-action-worker.service';
import { CoreJobsService } from './core-jobs.service';

/**
 * WorkerModule provides all background worker services for the application:
 *
 * - WorkerService: Top-level orchestrator that starts/stops all workers
 * - CronWorkerService: Polls cron_events table and executes due cron jobs
 * - ScheduledActionWorkerService: Polls scheduled_actions table and processes pending actions
 * - CoreJobsService: Implements the 7 default cron job handlers + scheduled publishing
 *
 * This module is global so workers are available across the application.
 */
@Global()
@Module({
  providers: [WorkerService, CronWorkerService, ScheduledActionWorkerService, CoreJobsService],
  exports: [WorkerService, CronWorkerService, ScheduledActionWorkerService, CoreJobsService],
})
export class WorkerModule {}
