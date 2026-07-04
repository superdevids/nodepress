import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

/**
 * CoreJobsService implements the 7 default cron job handlers for NodePress.
 * These jobs are registered as CronEvent rows during system initialization
 * and executed by the CronWorkerService on schedule.
 */
@Injectable()
export class CoreJobsService {
  private readonly logger = new Logger(CoreJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register the 7 default cron jobs into the cron_events table.
   * Skips any hook that is already registered to avoid duplicates.
   */
  async registerDefaultJobs(): Promise<void> {
    const defaults: Array<{
      hook: string;
      schedule: string;
      description: string;
    }> = [
      {
        hook: 'nodepress/check-plugin-updates',
        schedule: '0 */6 * * *',
        description: 'Check for plugin updates every 6 hours',
      },
      {
        hook: 'nodepress/check-theme-updates',
        schedule: '0 */12 * * *',
        description: 'Check for theme updates every 12 hours',
      },
      {
        hook: 'nodepress/content-cleanup',
        schedule: '0 3 * * *',
        description: 'Clean up trashed content, spam comments, old revisions daily at 3am',
      },
      {
        hook: 'nodepress/session-cleanup',
        schedule: '0 * * * *',
        description: 'Clean up expired sessions every hour',
      },
      {
        hook: 'nodepress/audit-log-cleanup',
        schedule: '0 4 * * 0',
        description: 'Purge audit log entries older than retention period weekly on Sunday',
      },
      {
        hook: 'nodepress/db-optimize',
        schedule: '0 5 * * 0',
        description: 'Run database maintenance (ANALYZE, VACUUM) weekly on Sunday',
      },
      {
        hook: 'nodepress/email-digest',
        schedule: '0 8 * * 1',
        description: 'Send scheduled email digests weekly on Monday',
      },
    ];

    for (const job of defaults) {
      const existing = await this.prisma.cronEvent.findFirst({
        where: { hook: job.hook },
      });

      if (!existing) {
        await this.prisma.cronEvent.create({
          data: {
            hook: job.hook,
            schedule: job.schedule,
            status: 'active',
            description: job.description,
            errorCount: 0,
          },
        });
        this.logger.log(`Registered default cron job: ${job.hook} (${job.schedule})`);
      }
    }
  }

  // ─── Job Handlers ─────────────────────────────────────────

  /**
   * Check for plugin updates by triggering the registry client.
   * Hook: nodepress/check-plugin-updates — Every 6 hours.
   */
  async handlePluginUpdateCheck(): Promise<{ checked: number; updates: number }> {
    this.logger.log('Running plugin update check...');

    try {
      const activePlugins = await this.prisma.plugin.findMany({
        where: { active: true },
      });

      let updatesFound = 0;
      for (const plugin of activePlugins) {
        // TODO (Gap A-020): Implement actual update check by querying the plugin
        // registry (RegistryClient) for the latest available version and comparing
        // it against plugin.version. If a newer version exists, increment updatesFound
        // and optionally record the available update in plugin meta.
        this.logger.debug(`Checked plugin: ${plugin.slug} (v${plugin.version})`);
      }

      this.logger.log(`Plugin update check complete: ${activePlugins.length} plugins checked`);
      return { checked: activePlugins.length, updates: updatesFound };
    } catch (error) {
      this.logger.error(`Plugin update check failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Check for theme updates by scanning active themes.
   * Hook: nodepress/check-theme-updates — Every 12 hours.
   */
  async handleThemeUpdateCheck(): Promise<{ checked: number; updates: number }> {
    this.logger.log('Running theme update check...');

    try {
      const themes = await this.prisma.theme.findMany();

      let updatesFound = 0;
      for (const theme of themes) {
        // In a full implementation, this would check the theme directory
        // or registry for newer versions.
        this.logger.debug(`Checked theme: ${theme.slug} (v${theme.version})`);
      }

      this.logger.log(`Theme update check complete: ${themes.length} themes checked`);
      return { checked: themes.length, updates: updatesFound };
    } catch (error) {
      this.logger.error(`Theme update check failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Clean up old trashed content, spam comments, and excess revisions.
   * Hook: nodepress/content-cleanup — Daily at 3am.
   */
  async handleContentCleanup(): Promise<{
    trashedPurged: number;
    spamPurged: number;
    revisionsRemoved: number;
  }> {
    this.logger.log('Running content cleanup...');
    const results = { trashedPurged: 0, spamPurged: 0, revisionsRemoved: 0 };

    try {
      // Purge trashed entries older than 30 days
      results.trashedPurged = await this.prisma.$executeRawUnsafe(
        `DELETE FROM content_entries
         WHERE status = 'TRASHED'
         AND updated_at < NOW() - INTERVAL '30 days'`,
      );

      // Purge spam comments older than 7 days
      results.spamPurged = await this.prisma.$executeRawUnsafe(
        `DELETE FROM comments
         WHERE status = 'SPAM'
         AND created_at < NOW() - INTERVAL '7 days'`,
      );

      // Keep only the last 10 revisions per entry
      results.revisionsRemoved = await this.prisma.$executeRawUnsafe(
        `DELETE FROM revisions r
         WHERE r.id IN (
           SELECT r2.id FROM (
             SELECT id, ROW_NUMBER() OVER (
               PARTITION BY entry_id ORDER BY created_at DESC
             ) AS rn
             FROM revisions
           ) r2
           WHERE r2.rn > 10
         )`,
      );

      // Also purge expired transients
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM settings
         WHERE ("group" = 'transient' OR key LIKE '_transient_%')
         AND (value->>'expires_at' IS NOT NULL
           AND (value->>'expires_at')::bigint < EXTRACT(EPOCH FROM NOW())::bigint)`,
      );

      // Remove orphaned media entries with no content association
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM media m
         WHERE NOT EXISTS (
           SELECT 1 FROM content_entries e WHERE e.featured_image_id = m.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM content_entries e
           WHERE e.data->>'featured_image' = m.id
         )`,
      );

      this.logger.log(
        `Content cleanup complete: ${results.trashedPurged} trashed, ${results.spamPurged} spam, ${results.revisionsRemoved} revisions`,
      );
      return results;
    } catch (error) {
      this.logger.error(`Content cleanup failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Clean up expired sessions from the database.
   * Hook: nodepress/session-cleanup — Every hour.
   */
  async handleSessionCleanup(): Promise<{ removed: number }> {
    this.logger.log('Running session cleanup...');

    try {
      const removed = await this.prisma.$executeRawUnsafe(
        `DELETE FROM sessions WHERE expires_at < NOW()`,
      );

      // Also clean up expired login cookies
      await this.prisma.$executeRawUnsafe(`DELETE FROM login_cookies WHERE expires_at < NOW()`);

      // Clean up expired recovery tokens
      await this.prisma.$executeRawUnsafe(`DELETE FROM recovery_tokens WHERE expires_at < NOW()`);

      // Clean up expired password reset tokens
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`,
      );

      this.logger.log(`Session cleanup complete: ${removed} sessions removed`);
      return { removed };
    } catch (error) {
      this.logger.error(`Session cleanup failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Purge audit log entries older than the configured retention period (default: 12 months).
   * Hook: nodepress/audit-log-cleanup — Weekly on Sunday.
   */
  async handleAuditLogCleanup(): Promise<{ removed: number }> {
    this.logger.log('Running audit log cleanup...');

    try {
      // Read retention setting from DB, default to 12 months
      let retentionMonths = 12;
      try {
        const setting = await this.prisma.$queryRawUnsafe<{ value: string }[]>(
          `SELECT value FROM settings
           WHERE "group" = 'core' AND key = 'audit_log_retention_months'`,
        );
        if (setting.length > 0) {
          const parsed = parseInt(setting[0]?.value as string, 10);
          if (!isNaN(parsed) && parsed > 0) {
            retentionMonths = parsed;
          }
        }
      } catch {
        // Use default
      }

      const removed = await this.prisma.$executeRawUnsafe(
        `DELETE FROM audit_logs
         WHERE created_at < NOW() - INTERVAL '${retentionMonths} months'`,
      );

      this.logger.log(
        `Audit log cleanup complete: ${removed} entries older than ${retentionMonths} months removed`,
      );
      return { removed };
    } catch (error) {
      this.logger.error(`Audit log cleanup failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Run database optimization (ANALYZE, VACUUM) to maintain performance.
   * Hook: nodepress/db-optimize — Weekly on Sunday.
   */
  async handleDbOptimize(): Promise<{ tablesAnalyzed: number; tablesVacuumed: number }> {
    this.logger.log('Running database optimization...');

    try {
      // Run ANALYZE to update table statistics
      await this.prisma.$executeRawUnsafe(`ANALYZE`);

      // Get user tables for detailed stats
      const tables = await this.prisma.$queryRawUnsafe<{ tablename: string }[]>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
      );

      // Run VACUUM ANALYZE on key tables with high churn
      const highChurnTables = [
        'sessions',
        'audit_logs',
        'login_audit',
        'rate_limit_logs',
        'revisions',
        'webhook_deliveries',
      ];

      for (const table of highChurnTables) {
        try {
          await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${table}"`);
        } catch {
          // Table might not exist yet
        }
      }

      this.logger.log(`Database optimization complete: ${tables.length} tables analyzed`);
      return {
        tablesAnalyzed: tables.length,
        tablesVacuumed: highChurnTables.length,
      };
    } catch (error) {
      this.logger.error(`Database optimization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Send scheduled email digests to subscribed users.
   * Hook: nodepress/email-digest — Weekly on Monday at 8am.
   */
  async handleEmailDigest(): Promise<{ sent: number; skipped: number }> {
    this.logger.log('Running email digest...');

    try {
      // Check if email is configured
      const emailConfig = await this.prisma.setting.findFirst({
        where: { group: 'email', key: 'enabled' },
      });

      const emailEnabled = emailConfig?.value === true || emailConfig?.value === 'true';

      if (!emailEnabled) {
        this.logger.log('Email digest skipped: email not configured');
        return { sent: 0, skipped: 0 };
      }

      // Find users who have opted into email digests
      const digestEnabled = await this.prisma.userMeta.findMany({
        where: {
          key: 'email_digest_enabled',
          value: { equals: true },
        },
      });

      if (digestEnabled.length === 0) {
        this.logger.log('Email digest skipped: no users opted in');
        return { sent: 0, skipped: 0 };
      }

      // TODO (Gap A-019): Implement email digest generation and delivery:
      // 1. Gather recent content/activity since last digest (query content_entries
      //    and comments created since the last digest run)
      // 2. Generate HTML email content using a template
      // 3. Send via the mail manager (inject MailManager)
      // 4. Track delivery in mail_logs table
      // 5. Record the last digest timestamp to avoid re-sending

      this.logger.log(`Email digest would send to ${digestEnabled.length} users`);
      return { sent: 0, skipped: digestEnabled.length };
    } catch (error) {
      this.logger.error(`Email digest failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Publish content entries that are scheduled for publication.
   * Called every minute by the scheduler.
   */
  async handleScheduledPublishing(): Promise<{ published: number }> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `UPDATE content_entries
         SET status = 'PUBLISHED', published_at = NOW()
         WHERE status = 'SCHEDULED'
         AND published_at <= NOW()
         AND deleted_at IS NULL`,
      );

      if (result > 0) {
        this.logger.log(`Published ${result} scheduled content entries`);
      }
      return { published: result };
    } catch (error) {
      this.logger.error(`Scheduled publishing failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Route a cron hook to the appropriate handler based on the hook name.
   * Throws if the hook is not recognized.
   */
  async executeByHook(hook: string): Promise<unknown> {
    switch (hook) {
      case 'nodepress/check-plugin-updates':
        return this.handlePluginUpdateCheck();
      case 'nodepress/check-theme-updates':
        return this.handleThemeUpdateCheck();
      case 'nodepress/content-cleanup':
        return this.handleContentCleanup();
      case 'nodepress/session-cleanup':
        return this.handleSessionCleanup();
      case 'nodepress/audit-log-cleanup':
        return this.handleAuditLogCleanup();
      case 'nodepress/db-optimize':
        return this.handleDbOptimize();
      case 'nodepress/email-digest':
        return this.handleEmailDigest();
      case 'nodepress/scheduled-publishing':
        return this.handleScheduledPublishing();
      default:
        throw new Error(`No handler registered for hook: ${hook}`);
    }
  }
}
