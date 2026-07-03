import type { PrismaClient } from "@nodepressjs/db";

export type AutoUpdateMode = "all" | "none" | string[];

export interface ThemeAutoUpdateConfig {
  enabled: boolean;
  mode: AutoUpdateMode;
  checkIntervalMs: number;
  lastCheckedAt: Date | null;
}

export interface ThemeUpdateInfo {
  slug: string;
  currentVersion: string;
  availableVersion: string;
  changelog?: string;
  severity: "patch" | "minor" | "major";
}

export interface ThemeUpdateResult {
  slug: string;
  fromVersion: string;
  toVersion: string;
  success: boolean;
  error?: string;
}

export class ThemeAutoUpdater {
  private prisma: PrismaClient;
  private config: ThemeAutoUpdateConfig;
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private updateHandlers: Array<(update: ThemeUpdateResult) => void> = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.config = {
      enabled: this.resolveEnvSetting(),
      mode: "all",
      checkIntervalMs: 86400000, // 24 hours
      lastCheckedAt: null,
    };
  }

  private resolveEnvSetting(): boolean {
    const env = process.env.NODEPRESS_AUTO_UPDATE_THEMES ?? "none";
    return env !== "none";
  }

  getAutoUpdateMode(): AutoUpdateMode {
    const env = process.env.NODEPRESS_AUTO_UPDATE_THEMES ?? "none";
    if (env === "all") return "all";
    if (env === "none") return "none";
    return env.split(",").map((s: string) => s.trim());
  }

  shouldAutoUpdate(themeSlug: string): boolean {
    const mode = this.getAutoUpdateMode();
    if (mode === "all") return true;
    if (mode === "none") return false;
    return mode.includes(themeSlug);
  }

  start(autoCheck: boolean = true): void {
    this.config.enabled = true;
    if (autoCheck && !this.checkTimer) {
      this.checkTimer = setInterval(() => {
        this.checkForUpdates().catch(() => {});
      }, this.config.checkIntervalMs);
    }
  }

  stop(): void {
    this.config.enabled = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  isRunning(): boolean {
    return this.config.enabled;
  }

  onUpdate(handler: (update: ThemeUpdateResult) => void): () => void {
    this.updateHandlers.push(handler);
    return () => {
      const idx = this.updateHandlers.indexOf(handler);
      if (idx >= 0) this.updateHandlers.splice(idx, 1);
    };
  }

  async checkForUpdates(): Promise<ThemeUpdateInfo[]> {
    const themes = await this.prisma.theme.findMany();
    const updates: ThemeUpdateInfo[] = [];

    for (const theme of themes) {
      if (!this.shouldAutoUpdate(theme.slug)) continue;

      try {
        const available = await this.fetchLatestVersion(theme.slug);
        if (available && this.isNewerVersion(theme.version, available.version)) {
          updates.push({
            slug: theme.slug,
            currentVersion: theme.version,
            availableVersion: available.version,
            changelog: available.changelog,
            severity: this.determineSeverity(theme.version, available.version),
          });
        }
      } catch {
        // Skip theme if check fails
      }
    }

    this.config.lastCheckedAt = new Date();
    return updates;
  }

  async applyUpdates(updates: ThemeUpdateInfo[]): Promise<ThemeUpdateResult[]> {
    const results: ThemeUpdateResult[] = [];

    for (const update of updates) {
      if (!this.shouldAutoUpdate(update.slug)) continue;

      try {
        const downloadResult = await this.downloadThemeUpdate(update.slug, update.availableVersion);

        if (downloadResult) {
          await this.prisma.theme.update({
            where: { slug: update.slug },
            data: { version: update.availableVersion },
          });

          const result: ThemeUpdateResult = {
            slug: update.slug,
            fromVersion: update.currentVersion,
            toVersion: update.availableVersion,
            success: true,
          };

          results.push(result);
          this.notifyHandlers(result);
        }
      } catch (error) {
        const result: ThemeUpdateResult = {
          slug: update.slug,
          fromVersion: update.currentVersion,
          toVersion: update.availableVersion,
          success: false,
          error: (error as Error).message,
        };

        results.push(result);
        this.notifyHandlers(result);
      }
    }

    return results;
  }

  async updateTheme(slug: string): Promise<ThemeUpdateResult> {
    const updates = await this.checkForUpdates();
    const themeUpdate = updates.find((u) => u.slug === slug);
    if (!themeUpdate) {
      return {
        slug,
        fromVersion: "",
        toVersion: "",
        success: false,
        error: "No update available",
      };
    }

    const results = await this.applyUpdates([themeUpdate]);
    return results[0] ?? { slug, fromVersion: "", toVersion: "", success: false, error: "Update failed" };
  }

  async updateAll(): Promise<ThemeUpdateResult[]> {
    const updates = await this.checkForUpdates();
    return this.applyUpdates(updates);
  }

  private async fetchLatestVersion(slug: string): Promise<{ version: string; changelog?: string } | null> {
    try {
      const response = await fetch(
        `https://api.nodepress.dev/themes/${slug}/latest`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async downloadThemeUpdate(slug: string, version: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.nodepress.dev/themes/${slug}/download/${version}`,
        { signal: AbortSignal.timeout(30000) },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private isNewerVersion(current: string, available: string): boolean {
    const currentParts = current.split(".").map(Number);
    const availableParts = available.split(".").map(Number);

    for (let i = 0; i < Math.max(currentParts.length, availableParts.length); i++) {
      const curr = currentParts[i] ?? 0;
      const avail = availableParts[i] ?? 0;
      if (avail > curr) return true;
      if (avail < curr) return false;
    }
    return false;
  }

  private determineSeverity(current: string, available: string): "patch" | "minor" | "major" {
    const currentParts = current.split(".").map(Number);
    const availableParts = available.split(".").map(Number);

    if ((availableParts[0] ?? 0) > (currentParts[0] ?? 0)) return "major";
    if ((availableParts[1] ?? 0) > (currentParts[1] ?? 0)) return "minor";
    return "patch";
  }

  private notifyHandlers(result: ThemeUpdateResult): void {
    for (const handler of this.updateHandlers) {
      try {
        handler(result);
      } catch {
        // Silently handle handler errors
      }
    }
  }

  getConfig(): ThemeAutoUpdateConfig {
    return { ...this.config };
  }

  setCheckInterval(ms: number): void {
    this.config.checkIntervalMs = ms;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = setInterval(() => {
        this.checkForUpdates().catch(() => {});
      }, ms);
    }
  }
}
