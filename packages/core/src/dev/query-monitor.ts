/**
 * Query Monitor (Gap G-09).
 * Prisma middleware that logs all queries with duration and stack traces.
 * Active only in debug mode (NODEPRESS_DEBUG=true).
 *
 * Features:
 * - Log query + duration + stack trace
 * - Duplicate query detection
 * - N+1 query detection
 * - Slow query highlighting (>200ms)
 * - In-memory ring buffer (last 100 queries)
 * - Admin endpoint: GET /api/dev/queries
 */

import type { PrismaClient } from "@nodepress/db";

export interface QueryRecord {
  id: number;
  timestamp: Date;
  duration: number;
  model: string;
  action: string;
  query: string;
  params?: unknown[];
  stackTrace?: string;
  slow: boolean;
  duplicate: boolean;
}

export interface QueryMonitorStats {
  totalQueries: number;
  totalDuration: number;
  averageDuration: number;
  slowQueries: number;
  duplicateQueries: number;
  queries: QueryRecord[];
}

const RING_BUFFER_SIZE = 100;

class QueryMonitorImpl {
  private buffer: QueryRecord[] = [];
  private queryCounter = 0;
  private queryHistory = new Map<string, number>();
  private enabled = false;

  get isEnabled(): boolean {
    return this.enabled;
  }

  enable(): void {
    this.enabled = true;
    this.queryCounter = 0;
    this.queryHistory.clear();
  }

  disable(): void {
    this.enabled = false;
  }

  record(record: Omit<QueryRecord, "id">): void {
    if (!this.enabled) return;

    const id = ++this.queryCounter;
    const entry: QueryRecord = { id, ...record };

    if (this.buffer.length >= RING_BUFFER_SIZE) {
      this.buffer.shift();
    }
    this.buffer.push(entry);

    const queryKey = `${record.model}:${record.action}:${record.query}`;
    this.queryHistory.set(queryKey, (this.queryHistory.get(queryKey) ?? 0) + 1);
  }

  getStats(): QueryMonitorStats {
    const totalQueries = this.buffer.length;
    const totalDuration = this.buffer.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = this.buffer.filter((q) => q.slow).length;
    const duplicateQueries = this.buffer.filter((q) => q.duplicate).length;

    return {
      totalQueries,
      totalDuration,
      averageDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
      slowQueries,
      duplicateQueries,
      queries: [...this.buffer],
    };
  }

  clear(): void {
    this.buffer = [];
    this.queryHistory.clear();
  }

  detectDuplicate(query: string): boolean {
    const count = this.queryHistory.get(query);
    return (count ?? 0) > 1;
  }

  detectNplusOne(queries: QueryRecord[]): string[] {
    const modelActions = new Map<string, number>();
    for (const q of queries) {
      const key = `${q.model}:${q.action}`;
      modelActions.set(key, (modelActions.get(key) ?? 0) + 1);
    }

    const result: string[] = [];
    for (const [key, count] of modelActions) {
      if (count > 5 && key.endsWith(":findUnique")) {
        result.push(key);
      }
    }
    return result;
  }
}

export const queryMonitor = new QueryMonitorImpl();

/**
 * Install Prisma middleware that logs all queries.
 * Must be called before any Prisma queries are executed.
 */
export function installQueryMonitor(prisma: PrismaClient): void {
  const isDebug = process.env.NODEPRESS_DEBUG === "true" || process.env.NODE_ENV === "development";
  if (!isDebug) return;

  queryMonitor.enable();
  console.log("[QueryMonitor] Installed — monitoring all Prisma queries");

  prisma.$on("query" as never, (event: unknown) => {
    const e = event as { query: string; params: string; duration: number; timestamp: Date };
    const stackTrace = new Error().stack?.split("\n").slice(3, 8).join("\n") ?? "";
    const normalizedQuery = e.query.replace(/\s+/g, " ").trim();
    const isSlow = e.duration > 200;

    const match = normalizedQuery.match(/^(select|insert|update|delete|create)\s+/i);
    const action = match ? match[1]!.toLowerCase() : "unknown";

    const tableMatch = normalizedQuery.match(/(?:from|into|update|table)\s+"?(\w+)"?/i);
    const model = tableMatch ? tableMatch[1]! : "unknown";

    const isDuplicate = queryMonitor.detectDuplicate(normalizedQuery);

    if (isSlow) {
      console.warn(`[QueryMonitor] SLOW (${e.duration}ms): ${normalizedQuery.substring(0, 200)}`);
    }
    if (isDuplicate) {
      console.warn(`[QueryMonitor] DUPLICATE: ${normalizedQuery.substring(0, 200)}`);
    }

    queryMonitor.record({
      timestamp: e.timestamp ?? new Date(),
      duration: e.duration,
      model,
      action,
      query: normalizedQuery,
      params: e.params ? JSON.parse(e.params as string) as unknown[] : undefined,
      stackTrace,
      slow: isSlow,
      duplicate: isDuplicate,
    });
  });
}

/**
 * Get current query monitor statistics.
 */
export function getQueryStats(): QueryMonitorStats {
  return queryMonitor.getStats();
}

/**
 * Get detected N+1 query patterns.
 */
export function getNplusOnePatterns(): string[] {
  return queryMonitor.detectNplusOne(queryMonitor.getStats().queries);
}

/**
 * Clear all query history.
 */
export function clearQueryHistory(): void {
  queryMonitor.clear();
}
