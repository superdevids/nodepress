import { Module, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { BulkActionsController } from './bulk.controller';
import { BulkActionsService, BULK_QUEUE_NAME } from './bulk-actions.service';
import { SecurityAuditService } from '../common/security-audit.service';
import { ConfigService } from '../config/config.service';

export const BULK_QUEUE_TOKEN = 'BULK_QUEUE';
export const BULK_WORKER_TOKEN = 'BULK_WORKER';

@Module({
  controllers: [BulkActionsController],
  providers: [
    BulkActionsService,
    SecurityAuditService,
    {
      provide: BULK_QUEUE_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Queue(BULK_QUEUE_NAME, {
          connection: { url: redisUrl },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        });
      },
    },
    {
      provide: BULK_WORKER_TOKEN,
      inject: [ConfigService, BulkActionsService],
      useFactory: (config: ConfigService, bulkActionsService: BulkActionsService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const worker = new Worker(
          BULK_QUEUE_NAME,
          async (job) => {
            return bulkActionsService.processJob(job.data);
          },
          {
            connection: { url: redisUrl },
            concurrency: 5,
          },
        );
        worker.on('completed', (job) => {
          console.log(`Bulk job ${job.id} completed`);
        });
        worker.on('failed', (job, err) => {
          console.error(`Bulk job ${job?.id} failed: ${err.message}`);
        });
        return worker;
      },
    },
  ],
  exports: [BulkActionsService],
})
export class BulkModule implements OnModuleDestroy {
  async onModuleDestroy() {
    // Cleanup is handled by the DI container
  }
}
