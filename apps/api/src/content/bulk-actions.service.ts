import { Injectable, Logger, ForbiddenException, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { SecurityAuditService } from '../common/security-audit.service';
import { BulkActionDto } from './dto/bulk-action.dto';
import { BULK_QUEUE_TOKEN } from './bulk.module';

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  /** When async, this provides a queue job ID for tracking */
  jobId?: string;
}

export interface BulkJobData {
  action: string;
  ids: string[];
  actorId: string;
  actorRole: string;
  ipAddress?: string;
  userAgent?: string;
  options?: { taxonomyId?: string; termId?: string };
}

/** Queue name for bulk action BullMQ jobs */
export const BULK_QUEUE_NAME = 'bulk-actions';

const ACTIONS_WITH_OWNERSHIP_CHECK = ['publish', 'unpublish', 'trash', 'delete', 'archive', 'restore'];
const SYNC_THRESHOLD = 100;

@Injectable()
export class BulkActionsService {
  private readonly logger = new Logger(BulkActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
    @Inject(BULK_QUEUE_TOKEN) private readonly bulkQueue?: Queue,
  ) {}

  /**
   * Execute a bulk action.
   * For fewer than SYNC_THRESHOLD items, processes synchronously.
   * For SYNC_THRESHOLD or more, enqueues a background BullMQ job.
   */
  async execute(
    dto: BulkActionDto,
    actor: { sub: string; role: string; permissions?: string[] },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<BulkActionResult> {
    const { action, ids, options } = dto;

    // 1. Validate the actor has the base permission for this action
    this.validateActionPermission(action, actor.role, actor.permissions);

    if (ids.length >= SYNC_THRESHOLD) {
      return this.enqueueAsync(action, ids, actor, options, meta);
    }

    return this.processSync(action, ids, actor, options, meta);
  }

  // ───────────────────────────────────────────────
  //  SYNC PROCESSING  (< 100 items)
  // ───────────────────────────────────────────────

  private async processSync(
    action: string,
    ids: string[],
    actor: { sub: string; role: string },
    options?: { taxonomyId?: string; termId?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = { success: true, processed: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        // 2. Per-item ownership/permission check
        await this.checkItemPermission(id, action, actor.sub, actor.role);

        // 3. Capture "before" state for audit
        const before = await this.captureBeforeState(id, action);

        // 4. Execute the action
        await this.executeAction(id, action, options);

        // 5. Capture "after" state
        const after = await this.captureAfterState(id, action);

        // 6. Audit log
        await this.audit.log({
          actorId: actor.sub,
          action: `bulk.${action}`,
          targetType: 'content_entry',
          targetId: id,
          before: before ?? undefined,
          after: after ?? undefined,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        result.processed++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Entry ${id}: ${error.message}`);
        this.logger.warn(`Bulk ${action} failed for ${id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Bulk ${action}: ${result.processed} OK, ${result.failed} failed (sync)`,
    );
    return result;
  }

  // ───────────────────────────────────────────────
  //  ASYNC PROCESSING  (>= 100 items)
  // ───────────────────────────────────────────────

  private async enqueueAsync(
    action: string,
    ids: string[],
    actor: { sub: string; role: string },
    options?: { taxonomyId?: string; termId?: string },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<BulkActionResult> {
    if (!this.bulkQueue) {
      // Fallback to sync if BullMQ queue is unavailable
      this.logger.warn('BullMQ queue not available, falling back to sync processing');
      return this.processSync(action, ids, actor, options, meta);
    }

    const job = await this.bulkQueue.add('bulk-action', {
      action,
      ids,
      actorId: actor.sub,
      actorRole: actor.role,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      options,
    } as BulkJobData);

    this.logger.log(
      `Bulk ${action}: ${ids.length} items enqueued as job ${job.id} (async)`,
    );

    return {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      jobId: job.id,
    };
  }

  /**
   * Process a bulk action job from the queue.
   * Called by the BullMQ worker (see bulk.module.ts Worker factory).
   */
  async processJob(jobData: BulkJobData): Promise<BulkActionResult> {
    const { action, ids, actorId, actorRole, ipAddress, userAgent, options } = jobData;
    const actor = { sub: actorId, role: actorRole };
    const meta = { ipAddress, userAgent };
    return this.processSync(action, ids, actor, options, meta);
  }

  // ───────────────────────────────────────────────
  //  PERMISSION CHECKS
  // ───────────────────────────────────────────────

  private validateActionPermission(
    action: string,
    role: string,
    permissions?: string[],
  ): void {
    // SUPER_ADMIN can do everything
    if (role === 'SUPER_ADMIN') return;

    switch (action) {
      case 'publish':
      case 'unpublish':
      case 'draft':
      case 'archive':
      case 'restore':
        if (!['ADMIN', 'EDITOR'].includes(role)) {
          throw new ForbiddenException(
            `Role ${role} is not allowed to ${action} content`,
          );
        }
        break;
      case 'trash':
        if (!['ADMIN', 'EDITOR'].includes(role)) {
          throw new ForbiddenException(
            `Role ${role} is not allowed to trash content`,
          );
        }
        break;
      case 'delete':
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
          throw new ForbiddenException(
            `Role ${role} is not allowed to permanently delete content`,
          );
        }
        break;
      default:
        throw new ForbiddenException(`Unknown action: ${action}`);
    }
  }

  private async checkItemPermission(
    entryId: string,
    action: string,
    userId: string,
    role: string,
  ): Promise<void> {
    // SUPER_ADMIN bypasses per-item checks
    if (role === 'SUPER_ADMIN') return;

    // For destructive actions on other people's content, only ADMIN+ can proceed
    if (ACTIONS_WITH_OWNERSHIP_CHECK.includes(action)) {
      const entry = await this.prisma.contentEntry.findUnique({
        where: { id: entryId },
        select: { authorId: true },
      });

      if (!entry) {
        throw new Error(`Content entry not found`);
      }

      // EDITOR can only act on own content for publish/unpublish/trash/delete
      if (role === 'EDITOR' && entry.authorId !== userId) {
        throw new Error(
          `You do not have permission to ${action} content owned by another user`,
        );
      }
    }
  }

  // ───────────────────────────────────────────────
  //  ACTION EXECUTORS
  // ───────────────────────────────────────────────

  private async executeAction(
    id: string,
    action: string,
    options?: { taxonomyId?: string; termId?: string },
  ): Promise<void> {
    switch (action) {
      case 'publish':
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
        break;

      case 'unpublish':
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'DRAFT', publishedAt: null },
        });
        break;

      case 'draft':
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'DRAFT' },
        });
        break;

      case 'trash':
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'TRASHED' },
        });
        break;

      case 'restore':
        // Restore from trash back to draft
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'DRAFT' },
        });
        break;

      case 'delete':
        await this.prisma.contentEntry.delete({ where: { id } });
        break;

      case 'archive':
        // Archived entries get PRIVATE status, excluding them from default queries
        await this.prisma.contentEntry.update({
          where: { id },
          data: { status: 'PRIVATE' },
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Handle taxonomy assignment if options provided
    if (
      options?.taxonomyId &&
      options?.termId &&
      (action === 'publish' || action === 'draft' || action === 'restore')
    ) {
      const term = await this.prisma.term.findUnique({
        where: { id: options.termId },
        select: { id: true, taxonomyId: true },
      });

      if (term && term.taxonomyId === options.taxonomyId) {
        await this.prisma.termRelation.upsert({
          where: {
            entryId_termId: { entryId: id, termId: options.termId },
          },
          create: { entryId: id, termId: options.termId },
          update: {},
        });
      }
    }
  }

  // ───────────────────────────────────────────────
  //  AUDIT HELPERS
  // ───────────────────────────────────────────────

  private async captureBeforeState(
    id: string,
    _action: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const entry = await this.prisma.contentEntry.findUnique({
        where: { id },
        select: { status: true, publishedAt: true },
      });
      if (!entry) return null;
      return {
        status: entry.status,
        publishedAt: entry.publishedAt?.toISOString() ?? null,
      };
    } catch {
      return null;
    }
  }

  private async captureAfterState(
    id: string,
    _action: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const entry = await this.prisma.contentEntry.findUnique({
        where: { id },
        select: { status: true, publishedAt: true },
      });
      if (!entry) return null;
      return {
        status: entry.status,
        publishedAt: entry.publishedAt?.toISOString() ?? null,
      };
    } catch {
      return null;
    }
  }
}
