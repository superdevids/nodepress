import { execSync } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@nodepress/db";

export type BackupType = "full" | "database" | "media" | "config";
export type BackupStatus = "pending" | "running" | "completed" | "failed" | "restoring";

export interface BackupRecord {
  id: string;
  path: string;
  size: number;
  type: BackupType;
  status: BackupStatus;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface BackupOptions {
  type?: BackupType;
  includeMedia?: boolean;
  includeConfig?: boolean;
  description?: string;
}

export interface RestoreOptions {
  type?: BackupType;
}

export interface RetentionConfig {
  daily: number;
  weekly: number;
  monthly: number;
}

export interface StorageProvider {
  upload(srcPath: string, destPath: string): Promise<void>;
  download(remotePath: string, localPath: string): Promise<void>;
  list(prefix: string): Promise<{ name: string; size: number; modified: Date }[]>;
  delete(path: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
  }

  async upload(srcPath: string, destPath: string): Promise<void> {
    const fullPath = join(this.baseDir, destPath);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    copyFileSync(srcPath, fullPath);
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    copyFileSync(join(this.baseDir, remotePath), localPath);
  }

  async list(prefix: string): Promise<{ name: string; size: number; modified: Date }[]> {
    const dir = join(this.baseDir, prefix);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).map((f) => {
      const p = join(dir, f);
      const s = statSync(p);
      return { name: f, size: s.size, modified: s.mtime };
    });
  }

  async delete(path: string): Promise<void> {
    unlinkSync(join(this.baseDir, path));
  }
}

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint: string;
  private region: string;
  private client: import("@aws-sdk/client-s3").S3Client | null = null;

  constructor(bucket: string, endpoint: string, region: string = "us-east-1") {
    this.bucket = bucket;
    this.endpoint = endpoint;
    this.region = region;
  }

  private async getClient(): Promise<import("@aws-sdk/client-s3").S3Client> {
    if (this.client) return this.client;
    const { S3Client } = await import("@aws-sdk/client-s3");
    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    });
    return this.client;
  }

  async upload(srcPath: string, destPath: string): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    const body = createReadStream(srcPath);
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: destPath, Body: body })
    );
  }

  async download(remotePath: string, localPath: string): Promise<void> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    const response = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: remotePath })
    );
    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body as NodeJS.ReadableStream, writeStream);
  }

  async list(prefix: string): Promise<{ name: string; size: number; modified: Date }[]> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix })
    );
    return (result.Contents || []).map((obj) => ({
      name: obj.Key || "",
      size: obj.Size || 0,
      modified: obj.LastModified || new Date(),
    }));
  }

  async delete(path: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));
  }
}

function dirname(p: string): string {
  return p.substring(0, p.lastIndexOf("/") > 0 ? p.lastIndexOf("/") : p.lastIndexOf("\\") > 0 ? p.lastIndexOf("\\") : p.length);
}

export class BackupManager {
  private prisma: PrismaClient;
  private backupDir: string;
  private storageProvider: StorageProvider;
  private retention!: RetentionConfig;
  private dbUrl: string;

  constructor(
    prisma: PrismaClient,
    options?: {
      backupDir?: string;
      storageProvider?: StorageProvider;
      retention?: Partial<RetentionConfig>;
    }
  ) {
    this.prisma = prisma;
    this.backupDir = options?.backupDir || join(process.cwd(), "backups");
    this.storageProvider = options?.storageProvider || new LocalStorageProvider(this.backupDir);
    this.retention = { daily: 7, weekly: 4, monthly: 3, ...options?.retention };
    this.dbUrl = process.env.DATABASE_URL || "";

    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupRecord> {
    const type = options.type || "full";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `nodepress-backup-${timestamp}.tar.gz`;
    const tempDir = join(this.backupDir, `.tmp-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    const id = createHash("sha256").update(filename + Date.now()).digest("hex").substring(0, 16);

    const record: BackupRecord = {
      id,
      path: filename,
      size: 0,
      type,
      status: "running",
      createdAt: new Date(),
      metadata: { description: options.description },
    };

    try {
      if (type === "full" || type === "database") {
        await this.dumpDatabase(join(tempDir, "db.sql"));
      }

      if ((type === "full" || type === "media") && options.includeMedia !== false) {
        await this.copyMediaFiles(join(tempDir, "media"));
      }

      if ((type === "full" || type === "config") && options.includeConfig !== false) {
        await this.exportConfig(join(tempDir, "config"));
      }

      if (type === "full") {
        await this.exportPluginSettings(join(tempDir, "plugins.json"));
      }

      await this.compressBackup(tempDir, join(this.backupDir, filename));
      rmSync(tempDir, { recursive: true, force: true });

      const stats = statSync(join(this.backupDir, filename));
      record.size = stats.size;
      record.status = "completed";

      await this.storageProvider.upload(
        join(this.backupDir, filename),
        filename
      );

      await this.saveRecord(record);
      await this.applyRetention();

      return record;
    } catch (err) {
      record.status = "failed";
      if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
      await this.saveRecord(record);
      throw err;
    }
  }

  async listBackups(): Promise<BackupRecord[]> {
    try {
      const records = await this.prisma.$queryRawUnsafe<BackupRecord[]>(
        'SELECT * FROM "backup_records" ORDER BY "created_at" DESC'
      );
      return records;
    } catch {
      const files = await this.storageProvider.list("nodepress-backup-");
      return files.map((f) => ({
        id: basename(f.name),
        path: f.name,
        size: f.size,
        type: "full" as BackupType,
        status: "completed" as BackupStatus,
        createdAt: f.modified,
      }));
    }
  }

  async restoreBackup(id: string, options: RestoreOptions = {}): Promise<void> {
    let record: BackupRecord | undefined;

    try {
      const rows = await this.prisma.$queryRawUnsafe<BackupRecord[]>(
        'SELECT * FROM "backup_records" WHERE "id" = $1',
        id
      );
      record = rows[0];
    } catch {
      const files = await this.storageProvider.list("nodepress-backup-");
      const match = files.find((f) => f.name.includes(id));
      if (match) {
        record = {
          id,
          path: match.name,
          size: match.size,
          type: "full",
          status: "completed",
          createdAt: match.modified,
        };
      }
    }

    if (!record) throw new Error(`Backup ${id} not found`);

    const tempDir = join(this.backupDir, `.restore-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const localPath = join(this.backupDir, basename(record.path));
      await this.storageProvider.download(record.path, localPath);
      await this.decompressBackup(localPath, tempDir);

      if (options.type !== "media" && options.type !== "config") {
        if (existsSync(join(tempDir, "db.sql"))) {
          await this.restoreDatabase(join(tempDir, "db.sql"));
        }
      }

      if (options.type !== "database" && options.type !== "config") {
        if (existsSync(join(tempDir, "media"))) {
          await this.restoreMediaFiles(join(tempDir, "media"));
        }
      }

      if (options.type !== "database" && options.type !== "media") {
        if (existsSync(join(tempDir, "config"))) {
          await this.restoreConfig(join(tempDir, "config"));
        }
      }

      record.status = "completed";
      await this.saveRecord(record);
    } catch (err) {
      record.status = "failed";
      await this.saveRecord(record);
      throw err;
    } finally {
      if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
    }
  }

  async deleteBackup(id: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      'DELETE FROM "backup_records" WHERE "id" = $1',
      id
    );
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    lastBackup: Date | null;
    storageUsed: number;
  }> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        { total: bigint; size: bigint; last: Date | null }[]
      >(
        `SELECT COUNT(*)::bigint as total, COALESCE(SUM(size), 0)::bigint as size, MAX(created_at) as last
         FROM "backup_records" WHERE status = 'completed'`
      );
      const row = rows[0];
      return {
        totalBackups: Number(row.total),
        totalSize: Number(row.size),
        lastBackup: row.last,
        storageUsed: Number(row.size),
      };
    } catch {
      const files = await this.storageProvider.list("nodepress-backup-");
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const lastBackup = files.length > 0
        ? files.sort((a, b) => b.modified.getTime() - a.modified.getTime())[0].modified
        : null;
      return { totalBackups: files.length, totalSize, lastBackup, storageUsed: totalSize };
    }
  }

  private async dumpDatabase(outPath: string): Promise<void> {
    const url = new URL(this.dbUrl);
    const dbName = url.pathname.replace("/", "");
    const host = url.hostname;
    const port = url.port || "5432";
    const user = url.username;
    const pass = url.password;

    const env = { ...process.env, PGPASSWORD: pass };
    execSync(
      `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -F p -f "${outPath}"`,
      { env, stdio: "pipe" }
    );
  }

  private async restoreDatabase(sqlPath: string): Promise<void> {
    const url = new URL(this.dbUrl);
    const dbName = url.pathname.replace("/", "");
    const host = url.hostname;
    const port = url.port || "5432";
    const user = url.username;
    const pass = url.password;

    const env = { ...process.env, PGPASSWORD: pass };
    execSync(
      `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${sqlPath}"`,
      { env, stdio: "pipe" }
    );
  }

  private async copyMediaFiles(dest: string): Promise<void> {
    const mediaDir = process.env.MEDIA_DIR || join(process.cwd(), "uploads");
    if (existsSync(mediaDir)) {
      execSync(`cp -r "${mediaDir}"/* "${dest}/"`, { stdio: "pipe" });
    }
  }

  private async restoreMediaFiles(src: string): Promise<void> {
    const mediaDir = process.env.MEDIA_DIR || join(process.cwd(), "uploads");
    if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
    execSync(`cp -r "${src}"/* "${mediaDir}/"`, { stdio: "pipe" });
  }

  private async exportConfig(dest: string): Promise<void> {
    const envPath = join(process.cwd(), ".env");
    if (existsSync(envPath)) {
      copyFileSync(envPath, join(dest, ".env"));
    }

    const config = {
      appUrl: process.env.APP_URL,
      appEnv: process.env.NODE_ENV,
      mediaMaxFileSize: process.env.MEDIA_MAX_FILE_SIZE,
      cacheTtlDefault: process.env.CACHE_TTL_DEFAULT,
      logLevel: process.env.LOG_LEVEL,
      mailProvider: process.env.MAIL_PROVIDER,
    };
    writeFileSync(join(dest, "settings.json"), JSON.stringify(config, null, 2));
  }

  private async restoreConfig(src: string): Promise<void> {
    const envPath = join(src, ".env");
    if (existsSync(envPath)) {
      copyFileSync(envPath, join(process.cwd(), ".env.restored"));
    }
  }

  private async exportPluginSettings(outPath: string): Promise<void> {
    try {
      const plugins = await this.prisma.plugin.findMany();
      writeFileSync(outPath, JSON.stringify(plugins, null, 2));
    } catch {
      writeFileSync(outPath, JSON.stringify([]));
    }
  }

  private async compressBackup(srcDir: string, outPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const tar = execSync(
        `tar -czf "${outPath}" -C "${srcDir}" .`,
        { stdio: "pipe" }
      );
      resolve();
    });
  }

  private async decompressBackup(srcPath: string, destDir: string): Promise<void> {
    execSync(`tar -xzf "${srcPath}" -C "${destDir}"`, { stdio: "pipe" });
  }

  private async saveRecord(record: BackupRecord): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO backup_records (id, path, size, type, status, created_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (id) DO UPDATE SET status = $4, size = $3`,
        record.id,
        record.path,
        record.size,
        record.type,
        record.status,
        record.createdAt,
        JSON.stringify(record.metadata || {})
      );
    } catch {
    }
  }

  private async applyRetention(): Promise<void> {
    const all = await this.listBackups();
    const now = new Date();

    const byType = {
      daily: all.filter((b) => {
        const diff = now.getTime() - b.createdAt.getTime();
        return diff < 7 * 86400000;
      }),
      weekly: all.filter((b) => {
        const diff = now.getTime() - b.createdAt.getTime();
        return diff >= 7 * 86400000 && diff < 28 * 86400000;
      }),
      monthly: all.filter((b) => {
        const diff = now.getTime() - b.createdAt.getTime();
        return diff >= 28 * 86400000;
      }),
    };

    const toDelete: string[] = [];

    for (const [type, backups] of Object.entries(byType)) {
      const limit = this.retention[type as keyof RetentionConfig] || 0;
      if (backups.length > limit) {
        const sorted = backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        toDelete.push(...sorted.slice(limit).map((b) => b.id));
      }
    }

    for (const id of toDelete) {
      await this.deleteBackup(id);
    }
  }
}
