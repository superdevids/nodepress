import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

export interface AssetDefinition {
  handle: string;
  path: string;
  deps: string[];
  version: string;
  inFooter?: boolean;
  media?: string;
  type: "script" | "style";
}

export interface EnqueuedScript {
  handle: string;
  path: string;
  deps: string[];
  version: string;
  inFooter: boolean;
  content?: string;
  hash: string;
}

export interface EnqueuedStyle {
  handle: string;
  path: string;
  deps: string[];
  version: string;
  media: string;
  content?: string;
  hash: string;
}

export class AssetRegistry {
  private scripts = new Map<string, EnqueuedScript>();
  private styles = new Map<string, EnqueuedStyle>();
  private isProduction: boolean;

  constructor(isProduction: boolean = false) {
    this.isProduction = isProduction;
  }

  enqueueScript(
    handle: string,
    path: string,
    deps: string[] = [],
    version: string = "1.0.0",
    inFooter: boolean = false
  ): void {
    const hash = this.fileHash(path);
    const existing = this.scripts.get(handle);
    if (existing) {
      if (existing.path !== path) {
        console.warn(`[AssetRegistry] Script "${handle}" already enqueued with a different path. Keeping original.`);
      }
      return;
    }
    this.scripts.set(handle, { handle, path, deps, version, inFooter, hash });
  }

  enqueueStyle(
    handle: string,
    path: string,
    deps: string[] = [],
    version: string = "1.0.0",
    media: string = "all"
  ): void {
    const hash = this.fileHash(path);
    const existing = this.styles.get(handle);
    if (existing) {
      if (existing.path !== path) {
        console.warn(`[AssetRegistry] Style "${handle}" already enqueued with a different path. Keeping original.`);
      }
      return;
    }
    this.styles.set(handle, { handle, path, deps, version, media, hash });
  }

  dequeue(handle: string): void {
    this.scripts.delete(handle);
    this.styles.delete(handle);
  }

  getScripts(): EnqueuedScript[] {
    return this.sortByDeps(Array.from(this.scripts.values()));
  }

  getStyles(): EnqueuedStyle[] {
    return this.sortByDeps(Array.from(this.styles.values()));
  }

  getScript(handle: string): EnqueuedScript | undefined {
    return this.scripts.get(handle);
  }

  getStyle(handle: string): EnqueuedStyle | undefined {
    return this.styles.get(handle);
  }

  getScriptHtml(): string {
    const scripts = this.getScripts();
    const baseUrl = "";

    return scripts
      .map((s) => {
        const src = this.isProduction
          ? `${baseUrl}/assets/${s.hash}.js?v=${s.version}`
          : s.path;
        return `<script src="${src}"></script>`;
      })
      .join("\n");
  }

  getStyleHtml(): string {
    const styles = this.getStyles();
    const baseUrl = "";

    return styles
      .map((s) => {
        const href = this.isProduction
          ? `${baseUrl}/assets/${s.hash}.css?v=${s.version}`
          : s.path;
        return `<link rel="stylesheet" href="${href}" media="${s.media}" />`;
      })
      .join("\n");
  }

  getHeadHtml(): string {
    return this.getStyleHtml();
  }

  getFooterHtml(): string {
    return this.getScripts()
      .filter((s) => s.inFooter)
      .map((s) => {
        const baseUrl = "";
        const src = this.isProduction
          ? `${baseUrl}/assets/${s.hash}.js?v=${s.version}`
          : s.path;
        return `<script src="${src}"></script>`;
      })
      .join("\n");
  }

  private sortByDeps<T extends { handle: string; deps: string[] }>(items: T[]): T[] {
    const visited = new Set<string>();
    const result: T[] = [];
    const itemMap = new Map(items.map((i) => [i.handle, i]));

    const visit = (handle: string): void => {
      if (visited.has(handle)) return;
      visited.add(handle);
      const item = itemMap.get(handle);
      if (!item) return;
      for (const dep of item.deps) {
        visit(dep);
      }
      result.push(item);
    };

    for (const item of items) {
      visit(item.handle);
    }

    return result;
  }

  private fileHash(filePath: string): string {
    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath);
        return createHash("md5").update(content).digest("hex").slice(0, 12);
      }
    } catch {
      // ignore
    }
    return createHash("md5").update(filePath).digest("hex").slice(0, 12);
  }

  reset(): void {
    this.scripts.clear();
    this.styles.clear();
  }
}
