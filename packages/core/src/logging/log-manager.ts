import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { EventEmitter } from "node:events";
import { hostname } from "node:os";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LogEntry {
  level: LogLevel;
  time: number;
  msg: string;
  pid: number;
  hostname: string;
  name?: string;
  [key: string]: unknown;
}

export interface LogFilter {
  level?: LogLevel;
  search?: string;
  startDate?: string;
  endDate?: string;
  offset?: number;
  limit?: number;
}

export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  created: Date;
  modified: Date;
}

export interface LogRotationConfig {
  maxSize: number;
  maxFiles: number;
}

export class LogManager extends EventEmitter {
  private logDir: string;
  private config: LogRotationConfig;
  private currentStream!: NodeJS.WritableStream;
  private currentSize: number = 0;
  private currentFileIndex: number = 0;
  private tailClients: Set<(entry: LogEntry) => void> = new Set();

  constructor(
    logDir?: string,
    config?: Partial<LogRotationConfig>
  ) {
    super();
    this.logDir = logDir || join(process.cwd(), "logs");
    this.config = {
      maxSize: parseInt(process.env.LOG_MAX_SIZE || "104857600", 10),
      maxFiles: parseInt(process.env.LOG_MAX_FILES || "10", 10),
      ...config,
    };

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    this.initCurrentStream();
  }

  private initCurrentStream(): void {
    const files = this.getLogFiles().sort();
    this.currentFileIndex = files.length > 0
      ? parseInt(files[files.length - 1].name.match(/nodepress-(\d+)\.log/)?.[1] || "0", 10) + 1
      : 0;

    const logPath = join(this.logDir, `nodepress-${this.currentFileIndex}.log`);
    this.currentStream = createWriteStream(logPath, { flags: "a" });
    this.currentSize = existsSync(logPath) ? statSync(logPath).size : 0;
  }

  log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      time: Date.now(),
      msg,
      pid: process.pid,
      hostname: hostname(),
      ...context,
    };

    const line = JSON.stringify(entry) + "\n";
    const lineSize = Buffer.byteLength(line);

    if (this.currentSize + lineSize > this.config.maxSize) {
      this.rotate();
    }

    this.currentStream.write(line);
    this.currentSize += lineSize;

    this.broadcast(entry);
  }

  fatal(msg: string, context?: Record<string, unknown>): void {
    this.log("fatal", msg, context);
  }

  error(msg: string, context?: Record<string, unknown>): void {
    this.log("error", msg, context);
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    this.log("warn", msg, context);
  }

  info(msg: string, context?: Record<string, unknown>): void {
    this.log("info", msg, context);
  }

  debug(msg: string, context?: Record<string, unknown>): void {
    this.log("debug", msg, context);
  }

  trace(msg: string, context?: Record<string, unknown>): void {
    this.log("trace", msg, context);
  }

  getLogFiles(): LogFileInfo[] {
    if (!existsSync(this.logDir)) return [];
    return readdirSync(this.logDir)
      .filter((f) => f.endsWith(".log"))
      .map((f) => {
        const p = join(this.logDir, f);
        const s = statSync(p);
        return {
          name: f,
          path: p,
          size: s.size,
          created: s.birthtime,
          modified: s.mtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  }

  getLogs(filter: LogFilter = {}): { entries: LogEntry[]; total: number } {
    const files = this.getLogFiles();
    if (files.length === 0) return { entries: [], total: 0 };

    const allLines: string[] = [];
    for (const file of files) {
      const content = readFileSync(file.path, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      allLines.push(...lines);
    }

    let entries: LogEntry[] = allLines
      .map((line) => {
        try {
          const parsed = JSON.parse(line) as LogEntry;
          if (typeof parsed.level === "string" && typeof parsed.msg === "string") {
            return parsed;
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((e): e is LogEntry => e !== null);

    if (filter.level) {
      const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
      const minIdx = levels.indexOf(filter.level);
      entries = entries.filter((e) => levels.indexOf(e.level) >= minIdx);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      entries = entries.filter((e) => e.msg.toLowerCase().includes(q));
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      entries = entries.filter((e) => e.time >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      entries = entries.filter((e) => e.time <= end);
    }

    entries.sort((a, b) => b.time - a.time);

    const total = entries.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return {
      entries: entries.slice(offset, offset + limit),
      total,
    };
  }

  async downloadLog(fileName: string): Promise<Buffer> {
    const { readFile } = await import("node:fs/promises");
    const filePath = join(this.logDir, fileName);
    return readFile(filePath);
  }

  subscribeToTail(callback: (entry: LogEntry) => void): () => void {
    this.tailClients.add(callback);
    return () => {
      this.tailClients.delete(callback);
    };
  }

  getStats(): {
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    const files = this.getLogFiles();
    if (files.length === 0) {
      return { totalFiles: 0, totalSize: 0, oldestFile: null, newestFile: null };
    }
    return {
      totalFiles: files.length,
      totalSize: files.reduce((s, f) => s + f.size, 0),
      oldestFile: files[files.length - 1]?.created || null,
      newestFile: files[0]?.created || null,
    };
  }

  private rotate(): void {
    this.currentStream.end();
    this.currentFileIndex++;

    const rotatedPath = join(this.logDir, `nodepress-${this.currentFileIndex}.log`);
    this.currentStream = createWriteStream(rotatedPath, { flags: "a" });
    this.currentSize = 0;

    this.enforceMaxFiles();
  }

  private enforceMaxFiles(): void {
    const files = this.getLogFiles();
    if (files.length > this.config.maxFiles) {
      const toDelete = files.slice(this.config.maxFiles);
      for (const file of toDelete) {
        try {
          unlinkSync(file.path);
        } catch {
        }
      }
    }
  }

  private broadcast(entry: LogEntry): void {
    for (const client of this.tailClients) {
      try {
        client(entry);
      } catch {
      }
    }
  }
}
