import { exec } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { PrismaClient } from "@nodepressjs/db";
import type { PluginManifest } from "../plugin/plugin-engine.js";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  changelog: string[];
}

export interface MigrationResult {
  name: string;
  applied: boolean;
  durationMs: number;
  error?: string;
}

export interface UpgradeOptions {
  dryRun?: boolean;
  targetVersion?: string;
}

export class UpgradeManager {
  private prisma: PrismaClient;
  private migrationsDir: string;
  private versionFile: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.migrationsDir = join(__dirname, "..", "..", "migrations");
    this.versionFile = join(__dirname, "..", "..", ".version");
  }

  async checkVersion(): Promise<VersionInfo> {
    const current = await this.getCurrentVersion();
    const latest = await this.fetchLatestVersion();
    const updateAvailable = this.compareSemver(latest, current) > 0;
    const changelog = await this.getChangelog(current, latest);

    return { current, latest, updateAvailable, changelog };
  }

  async runMigrations(options: UpgradeOptions = {}): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const pending = await this.getPendingMigrations();

    if (options.dryRun) {
      return pending.map((m) => ({
        name: m,
        applied: false,
        durationMs: 0,
      }));
    }

    for (const migration of pending) {
      const start = Date.now();
      try {
        await this.applyMigration(migration);
        results.push({
          name: migration,
          applied: true,
          durationMs: Date.now() - start,
        });
      } catch (err) {
        results.push({
          name: migration,
          applied: false,
          durationMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!options.dryRun) {
      await this.runPrismaMigrate();
      await this.runDataTransformations();
    }

    return results;
  }

  async rollback(version: string): Promise<void> {
    const current = await this.getCurrentVersion();
    if (this.compareSemver(current, version) <= 0) {
      throw new Error(`Cannot rollback: current version ${current} is not ahead of ${version}`);
    }

    const applied = await this.getAppliedMigrations();
    const toRollback = applied.filter((m) => this.compareSemver(this.extractVersion(m), version) > 0);

    for (const migration of toRollback.reverse()) {
      await this.revertMigration(migration);
    }

    await this.setCurrentVersion(version);
  }

  async dryRun(): Promise<MigrationResult[]> {
    return this.runMigrations({ dryRun: true });
  }

  validatePluginCompatibility(manifest: PluginManifest, coreVersion: string): boolean {
    if (!manifest.requires) return true;
    return this.satisfiesSemver(coreVersion, manifest.requires);
  }

  private async getCurrentVersion(): Promise<string> {
    if (existsSync(this.versionFile)) {
      return readFileSync(this.versionFile, "utf-8").trim();
    }
    try {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf-8")
      );
      return pkg.version || "0.0.1";
    } catch {
      return "0.0.1";
    }
  }

  private async setCurrentVersion(version: string): Promise<void> {
    const dir = dirname(this.versionFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.versionFile, version, "utf-8");
  }

  private async fetchLatestVersion(): Promise<string> {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/nodepress/nodepress/main/packages/core/package.json"
      );
      const data = await response.json() as { version?: string };
      return data.version || "0.0.1";
    } catch {
      return "0.0.1";
    }
  }

  private async getChangelog(_from: string, _to: string): Promise<string[]> {
    return [
      "0.1.0 — Initial release with content engine, plugin system, auth",
      "0.2.0 — Added media library, taxonomies, comments",
      "0.3.0 — Webhooks, search, feeds, oEmbed, shortcodes",
      "0.4.0 — Security keys, permalinks, caching layer",
      "0.5.0 — Upgrade manager, backup/restore, i18n, logging",
    ].filter(() => true);
  }

  private async getPendingMigrations(): Promise<string[]> {
    if (!existsSync(this.migrationsDir)) return [];
    const applied = await this.getAppliedMigrations();
    const all = await this.listMigrationFiles();
    return all.filter((m) => !applied.includes(m));
  }

  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const record = await this.prisma.setting.findFirst({
        where: { group: "core", key: "applied_migrations" },
      });
      return (record?.value as string[]) || [];
    } catch {
      return [];
    }
  }

  private async listMigrationFiles(): Promise<string[]> {
    try {
      const { readdirSync } = await import("node:fs");
      if (!existsSync(this.migrationsDir)) return [];
      return readdirSync(this.migrationsDir)
        .filter((f) => f.endsWith(".sql") || f.endsWith(".ts"))
        .sort();
    } catch {
      return [];
    }
  }

  private async applyMigration(name: string): Promise<void> {
    const path = join(this.migrationsDir, name);
    if (name.endsWith(".sql")) {
      const sql = readFileSync(path, "utf-8");
      await this.prisma.$executeRawUnsafe(sql);
    } else if (name.endsWith(".ts")) {
      const mod = await import(path);
      if (typeof mod.up === "function") {
        await mod.up(this.prisma);
      }
    }

    const applied = await this.getAppliedMigrations();
    applied.push(name);
    await this.prisma.setting.upsert({
      where: { group_key: { group: "core", key: "applied_migrations" } },
      update: { value: applied },
      create: {
        group: "core",
        key: "applied_migrations",
        value: applied,
        autoload: false,
      },
    });
  }

  private async revertMigration(name: string): Promise<void> {
    const path = join(this.migrationsDir, name);
    if (name.endsWith(".ts")) {
      const mod = await import(path);
      if (typeof mod.down === "function") {
        await mod.down(this.prisma);
      }
    }

    const applied = await this.getAppliedMigrations();
    const idx = applied.indexOf(name);
    if (idx >= 0) {
      applied.splice(idx, 1);
      await this.prisma.setting.upsert({
        where: { group_key: { group: "core", key: "applied_migrations" } },
        update: { value: applied },
        create: {
          group: "core",
          key: "applied_migrations",
          value: applied,
          autoload: false,
        },
      });
    }
  }

  private async runPrismaMigrate(): Promise<void> {
    try {
      const cwd = join(__dirname, "..", "..", "..", "..", "..", "packages", "db");
      const { stdout, stderr } = await execAsync("npx prisma migrate deploy", { cwd });
      if (stderr) {
        throw new Error(stderr);
      }
    } catch (err) {
      throw new Error(`Prisma migration failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async runDataTransformations(): Promise<void> {
    const pending = await this.getPendingMigrations();
    for (const name of pending) {
      if (name.startsWith("data-")) {
        const mod = await import(join(this.migrationsDir, name));
        if (typeof mod.transform === "function") {
          await mod.transform(this.prisma);
        }
      }
    }
  }

  private compareSemver(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const da = pa[i] || 0;
      const db = pb[i] || 0;
      if (da > db) return 1;
      if (da < db) return -1;
    }
    return 0;
  }

  private extractVersion(migration: string): string {
    const match = migration.match(/^v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : "0.0.0";
  }

  private satisfiesSemver(version: string, range: string): boolean {
    if (range.startsWith("^")) {
      const major = range.slice(1).split(".")[0];
      return version.startsWith(`${major}.`);
    }
    if (range.startsWith(">=")) {
      return this.compareSemver(version, range.slice(2)) >= 0;
    }
    if (range.startsWith("~")) {
      const [major, minor] = range.slice(1).split(".");
      return version.startsWith(`${major}.${minor}`);
    }
    return this.compareSemver(version, range) >= 0;
  }
}
