import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { readFile, writeFile, cp } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@nodepressjs/db";

export interface RollbackPoint {
  version: string;
  timestamp: Date;
  path: string;
  sizeBytes: number;
}

export interface BackupResult {
  path: string;
  version: string;
  timestamp: Date;
}

export class RollbackManager {
  private backupRoot: string;
  private pluginsDir: string;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, backupRoot: string, pluginsDir: string) {
    this.prisma = prisma;
    this.backupRoot = backupRoot;
    this.pluginsDir = pluginsDir;
    if (!existsSync(backupRoot)) {
      mkdirSync(backupRoot, { recursive: true });
    }
  }

  async createBackup(slug: string, version: string): Promise<BackupResult> {
    const pluginDir = join(this.pluginsDir, slug);
    const timestamp = new Date();
    const ts = timestamp.toISOString().replace(/[:.]/g, "-");
    const backupPath = join(this.backupRoot, `${slug}-${version}-${ts}`);

    if (!existsSync(pluginDir)) {
      throw new Error(`Plugin directory not found: ${pluginDir}`);
    }

    await cp(pluginDir, backupPath, { recursive: true, force: true });

    const settings = await this.prisma.setting.findMany({
      where: { pluginId: slug },
    });

    if (settings.length) {
      await writeFile(
        join(backupPath, ".settings-backup.json"),
        JSON.stringify(settings, null, 2)
      );
    }

    const pluginRecord = await this.prisma.plugin.findUnique({ where: { slug } });
    if (pluginRecord) {
      await writeFile(
        join(backupPath, ".plugin-record-backup.json"),
        JSON.stringify(pluginRecord, null, 2)
      );
    }

    return { path: backupPath, version, timestamp };
  }

  async rollback(slug: string, version: string): Promise<void> {
    const points = await this.getRollbackPoints(slug);
    const target = points.find((p) => p.version === version);
    if (!target) {
      throw new Error(`No rollback point found for ${slug}@${version}`);
    }

    const pluginDir = join(this.pluginsDir, slug);

    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true, force: true });
    }

    await cp(target.path, pluginDir, { recursive: true, force: true });

    const settingsBackup = join(target.path, ".settings-backup.json");
    if (existsSync(settingsBackup)) {
      const content = await readFile(settingsBackup, "utf-8");
      const settings = JSON.parse(content);
      const plugin = await this.prisma.plugin.findUnique({ where: { slug } });
      if (plugin) {
        await this.prisma.setting.deleteMany({ where: { pluginId: slug } });
        for (const s of settings) {
          await this.prisma.setting.create({
            data: {
              group: s.group,
              key: s.key,
              value: s.value,
              autoload: s.autoload ?? true,
              pluginId: slug,
            },
          });
        }
      }
    }

    await this.prisma.plugin.update({
      where: { slug },
      data: { version },
    });
  }

  async getRollbackPoints(slug: string): Promise<RollbackPoint[]> {
    if (!existsSync(this.backupRoot)) return [];

    const entries = readdirSync(this.backupRoot);
    const prefix = `${slug}-`;
    const points: RollbackPoint[] = [];

    for (const entry of entries) {
      if (!entry.startsWith(prefix)) continue;
      const fullPath = join(this.backupRoot, entry);
      const stat = statSync(fullPath);
      if (!stat.isDirectory()) continue;

      const parts = entry.replace(prefix, "").split("-");
      const version = parts.slice(0, 3).join(".");

      points.push({
        version,
        timestamp: stat.mtime,
        path: fullPath,
        sizeBytes: this.dirSize(fullPath),
      });
    }

    points.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return points;
  }

  async cleanup(slug: string, keep: number = 5): Promise<void> {
    const points = await this.getRollbackPoints(slug);
    if (points.length <= keep) return;

    const toRemove = points.slice(keep);
    for (const point of toRemove) {
      rmSync(point.path, { recursive: true, force: true });
    }
  }

  autoRollback(slug: string, version: string): Promise<void> {
    return this.rollback(slug, version);
  }

  private dirSize(dirPath: string): number {
    let size = 0;
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          size += this.dirSize(fullPath);
        } else {
          size += stat.size;
        }
      }
    } catch {
      // ignore
    }
    return size;
  }
}
