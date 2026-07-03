import type { PrismaClient } from "@nodepress/db";
import { EventEmitter } from "node:events";

export interface TableInfo {
  name: string;
  size: string;
  rowCount: number;
  deadTuples: number;
  lastVacuum: Date | null;
  lastAutoVacuum: Date | null;
  lastAnalyze: Date | null;
}

export interface CleanupOptions {
  trashDays?: number;
  spamDays?: number;
  maxRevisions?: number;
  transientsPurge?: boolean;
  orphanedMedia?: boolean;
  archiveAuditMonths?: number;
}

export interface CleanupResult {
  trashedPurged: number;
  spamPurged: number;
  revisionsRemoved: number;
  transientsPurged: number;
  orphanedMediaRemoved: number;
  auditArchived: number;
  totalFreed: number;
  duration: number;
}

export interface OptimizationResult {
  operation: string;
  duration: number;
  success: boolean;
  details?: string;
}

export class DbOptimizer extends EventEmitter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
  }

  async analyze(): Promise<void> {
    await this.prisma.$executeRawUnsafe("ANALYZE");
  }

  async analyzeTable(table: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`ANALYZE "${table}"`);
  }

  async reindex(): Promise<void> {
    const tables = await this.getUserTables();
    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`REINDEX TABLE "${table}"`);
    }
  }

  async reindexTable(table: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE "${table}"`);
  }

  async vacuum(): Promise<void> {
    await this.prisma.$executeRawUnsafe("VACUUM ANALYZE");
  }

  async vacuumTable(table: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${table}"`);
  }

  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const start = Date.now();
    const result: CleanupResult = {
      trashedPurged: 0,
      spamPurged: 0,
      revisionsRemoved: 0,
      transientsPurged: 0,
      orphanedMediaRemoved: 0,
      auditArchived: 0,
      totalFreed: 0,
      duration: 0,
    };

    const trashDays = options.trashDays ?? 30;
    const spamDays = options.spamDays ?? 7;
    const maxRevisions = options.maxRevisions ?? 10;
    const archiveAuditMonths = options.archiveAuditMonths ?? 12;

    if (options.transientsPurge !== false) {
      const purged = await this.purgeExpiredTransients();
      result.transientsPurged = purged;
    }

    const trashed = await this.purgeTrashedEntries(trashDays);
    result.trashedPurged = trashed;

    const spam = await this.purgeSpamComments(spamDays);
    result.spamPurged = spam;

    const revisions = await this.keepLastRevisions(maxRevisions);
    result.revisionsRemoved = revisions;

    if (options.orphanedMedia !== false) {
      const orphaned = await this.removeOrphanedMedia();
      result.orphanedMediaRemoved = orphaned;
    }

    const archived = await this.archiveAuditLogs(archiveAuditMonths);
    result.auditArchived = archived;

    result.duration = Date.now() - start;
    result.totalFreed =
      result.trashedPurged +
      result.spamPurged +
      result.revisionsRemoved +
      result.transientsPurged +
      result.orphanedMediaRemoved +
      result.auditArchived;

    this.emit("cleanupComplete", result);

    return result;
  }

  async getTableInfo(): Promise<TableInfo[]> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        {
          relname: string;
          table_size: string;
          n_live_tup: number;
          n_dead_tup: number;
          last_vacuum: Date | null;
          last_autovacuum: Date | null;
          last_analyze: Date | null;
        }[]
      >(
        `SELECT
          relname,
          pg_size_pretty(pg_total_relation_size(relid)) as table_size,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC`
      );

      return rows.map((r) => ({
        name: r.relname,
        size: r.table_size,
        rowCount: r.n_live_tup,
        deadTuples: r.n_dead_tup,
        lastVacuum: r.last_vacuum,
        lastAutoVacuum: r.last_autovacuum,
        lastAnalyze: r.last_analyze,
      }));
    } catch {
      return [];
    }
  }

  async getTrashCounts(): Promise<{ entries: number; comments: number; media: number }> {
    try {
      const entries = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count FROM content_entries WHERE status = 'TRASHED'`
      );
      const comments = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint as count FROM comments WHERE status = 'SPAM' OR status = 'TRASHED'`
      );
      return {
        entries: Number(entries[0]?.count || 0),
        comments: Number(comments[0]?.count || 0),
        media: 0,
      };
    } catch {
      return { entries: 0, comments: 0, media: 0 };
    }
  }

  async getLastCleanup(): Promise<Date | null> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ value: string }[]>(
        `SELECT value FROM settings WHERE "group" = 'core' AND key = 'last_cleanup'`
      );
      return rows[0]?.value ? new Date(rows[0].value as string) : null;
    } catch {
      return null;
    }
  }

  async getDatabaseSize(): Promise<string> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ size: string }[]>(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      );
      return rows[0]?.size || "0";
    } catch {
      return "0";
    }
  }

  private async getUserTables(): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ tablename: string }[]>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
      );
      return rows.map((r) => r.tablename);
    } catch {
      return [];
    }
  }

  private async purgeTrashedEntries(days: number): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM content_entries
         WHERE status = 'TRASHED'
         AND updated_at < NOW() - INTERVAL '${days} days'`
      );
      return result;
    } catch {
      return 0;
    }
  }

  private async purgeSpamComments(days: number): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM comments
         WHERE status = 'SPAM'
         AND created_at < NOW() - INTERVAL '${days} days'`
      );
      return result;
    } catch {
      return 0;
    }
  }

  private async keepLastRevisions(maxRevisions: number): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM revisions r
         WHERE r.id IN (
           SELECT r2.id FROM (
             SELECT id, ROW_NUMBER() OVER (
               PARTITION BY entry_id ORDER BY created_at DESC
             ) AS rn
             FROM revisions
           ) r2
           WHERE r2.rn > $1
         )`,
        maxRevisions
      );
      return result;
    } catch {
      return 0;
    }
  }

  private async purgeExpiredTransients(): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM settings
         WHERE ("group" = 'transient' OR key LIKE '_transient_%')
         AND (value->>'expires_at' IS NOT NULL
           AND (value->>'expires_at')::bigint < EXTRACT(EPOCH FROM NOW())::bigint)`
      );
      return result;
    } catch {
      return 0;
    }
  }

  private async removeOrphanedMedia(): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM media m
         WHERE m.featured_image_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM content_entries e WHERE e.featured_image_id = m.id)`
      );
      return result;
    } catch {
      return 0;
    }
  }

  private async archiveAuditLogs(months: number): Promise<number> {
    try {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM audit_logs
         WHERE created_at < NOW() - INTERVAL '${months} months'`
      );
      return result;
    } catch {
      return 0;
    }
  }
}
