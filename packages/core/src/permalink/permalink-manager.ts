import { parseStructure, generateUrl, matchUrl, type ParsedStructure, type PermalinkParts, getDefaultStructures } from "./permalink-structure.js";
import type { CacheService } from "../cache/cache-service.js";

export interface PermalinkSettings {
  structure: string;
  categoryBase: string;
  tagBase: string;
  authorBase: string;
}

export const DEFAULT_SETTINGS: PermalinkSettings = {
  structure: "/%year%/%monthnum%/%postname%/",
  categoryBase: "category",
  tagBase: "tag",
  authorBase: "author",
};

export class PermalinkManager {
  private settings: PermalinkSettings;
  private parsed: ParsedStructure;
  private cache: CacheService | null;
  private storage: PermalinkStorage | null;

  constructor(cache?: CacheService, storage?: PermalinkStorage) {
    this.settings = { ...DEFAULT_SETTINGS };
    this.parsed = parseStructure(this.settings.structure);
    this.cache = cache ?? null;
    this.storage = storage ?? null;
  }

  setStorage(storage: PermalinkStorage): void {
    this.storage = storage;
  }

  setCache(cache: CacheService): void {
    this.cache = cache;
  }

  async loadSettings(): Promise<PermalinkSettings> {
    if (this.storage) {
      const saved = await this.storage.getPermalinkSettings();
      if (saved) {
        this.settings = { ...this.settings, ...saved };
        this.parsed = parseStructure(this.settings.structure);
      }
    }
    return this.getSettings();
  }

  async saveSettings(settings: Partial<PermalinkSettings>): Promise<PermalinkSettings> {
    this.settings = { ...this.settings, ...settings };
    this.parsed = parseStructure(this.settings.structure);

    if (this.cache) {
      await this.cache.delete("permalink:structure");
    }

    if (this.storage) {
      await this.storage.savePermalinkSettings(this.settings);
    }

    return this.getSettings();
  }

  getSettings(): PermalinkSettings {
    return { ...this.settings };
  }

  getParsedStructure(): ParsedStructure {
    return this.parsed;
  }

  generate(parts: PermalinkParts): string {
    return generateUrl(this.parsed, parts);
  }

  generateCanonical(parts: PermalinkParts): string {
    const url = this.generate(parts);
    return url;
  }

  match(url: string): Record<string, string> | null {
    return matchUrl(this.parsed, url);
  }

  guessRedirect(path: string): Record<string, string> | null {
    const defaultStructures = getDefaultStructures();
    for (const struct of defaultStructures) {
      if (struct.pattern === this.settings.structure) continue;
      const parsed = parseStructure(struct.pattern);
      const matched = matchUrl(parsed, path);
      if (matched) return matched;
    }
    return null;
  }

  getDefaults(): { label: string; pattern: string }[] {
    return getDefaultStructures();
  }
}

export interface PermalinkStorage {
  getPermalinkSettings(): Promise<PermalinkSettings | null>;
  savePermalinkSettings(settings: PermalinkSettings): Promise<void>;
}
