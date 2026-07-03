import type { PrismaClient } from "@nodepressjs/db";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

export interface UpdateCheckResult {
  available: boolean;
  latestVersion: string;
  downloadUrl: string;
  checksum: string;
  changelog?: string;
  security: boolean;
}

export interface RegistryClientConfig {
  registryUrl?: string;
  pluginsDir: string;
  backupDir: string;
}

function toBuffer(data: ArrayBuffer): Buffer {
  return Buffer.from(data);
}

export class RegistryClient {
  private config: RegistryClientConfig;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, config: RegistryClientConfig) {
    this.prisma = prisma;
    this.config = {
      registryUrl: "https://registry.nodepress.dev",
      ...config,
    };
  }

  async checkUpdate(slug: string, currentVersion: string): Promise<UpdateCheckResult> {
    const url = `${this.config.registryUrl}/api/plugins/${slug}/latest`;
    const response = await fetch(url);
    if (!response.ok) {
      return { available: false, latestVersion: currentVersion, downloadUrl: "", checksum: "", security: false };
    }
    const data = await response.json();
    const latestVersion: string = data.version;
    const available = this.compareVersions(latestVersion, currentVersion) > 0;

    return {
      available,
      latestVersion,
      downloadUrl: data.downloadUrl ?? `${this.config.registryUrl}/api/plugins/${slug}/download/${latestVersion}`,
      checksum: data.checksum ?? "",
      changelog: data.changelog,
      security: data.security ?? false,
    };
  }

  async downloadPackage(url: string, expectedChecksum: string): Promise<string> {
    const tmpDir = await mkdtemp(join(tmpdir(), "np-plugin-"));
    const tmpFile = join(tmpDir, "package.tar.gz");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    const buffer = toBuffer(await response.arrayBuffer());

    if (expectedChecksum) {
      const actualChecksum = createHash("sha256").update(buffer).digest("hex");
      if (actualChecksum !== expectedChecksum) {
        await rm(tmpDir, { recursive: true, force: true });
        throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(tmpFile);
      ws.write(buffer);
      ws.end();
      ws.on("finish", resolve);
      ws.on("error", reject);
    });

    return tmpFile;
  }

  async installPackage(slug: string, packagePath: string, version: string): Promise<boolean> {
    const targetDir = join(this.config.pluginsDir, slug);
    const oldDir = join(this.config.backupDir, `${slug}-pre-${version}`);

    if (existsSync(targetDir)) {
      if (existsSync(oldDir)) rmSync(oldDir, { recursive: true, force: true });
      renameSync(targetDir, oldDir);
    }

    mkdirSync(targetDir, { recursive: true });

    try {
      execSync(`tar -xzf "${packagePath}" -C "${targetDir}"`, { stdio: "pipe" });
    } catch {
      if (existsSync(oldDir)) {
        rmSync(targetDir, { recursive: true, force: true });
        renameSync(oldDir, targetDir);
      }
      throw new Error("Extraction failed");
    }

    try {
      const healthy = await this.healthCheck(slug);
      if (!healthy) {
        if (existsSync(oldDir)) {
          rmSync(targetDir, { recursive: true, force: true });
          renameSync(oldDir, targetDir);
        }
        return false;
      }
    } catch {
      if (existsSync(oldDir)) {
        rmSync(targetDir, { recursive: true, force: true });
        renameSync(oldDir, targetDir);
      }
      return false;
    }

    if (existsSync(oldDir)) {
      rmSync(oldDir, { recursive: true, force: true });
    }

    await this.prisma.plugin.update({
      where: { slug },
      data: { version },
    });

    return true;
  }

  private async healthCheck(slug: string): Promise<boolean> {
    try {
      const manifestPath = join(this.config.pluginsDir, slug, "plugin.json");
      const manifestStr = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestStr);
      return !!(manifest.slug && manifest.version);
    } catch {
      return false;
    }
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] ?? 0;
      const nb = pb[i] ?? 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
}
