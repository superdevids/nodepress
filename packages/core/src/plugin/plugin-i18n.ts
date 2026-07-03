import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface I18nStrings {
  [source: string]: string;
}

export class PluginI18n {
  private translations = new Map<string, I18nStrings>();
  private defaultLocale: string;
  private pluginsDir: string;

  constructor(_hooks?: unknown, pluginsDir: string = "", defaultLocale: string = "en_US") {
    this.pluginsDir = pluginsDir;
    this.defaultLocale = defaultLocale;
  }

  loadTranslations(slug: string, locale?: string): I18nStrings {
    const loc = locale ?? this.defaultLocale;
    const langDir = join(this.pluginsDir, slug, "languages");
    const langFile = join(langDir, `${loc}.json`);

    if (!existsSync(langFile)) {
      const fallback = join(langDir, "en_US.json");
      if (existsSync(fallback)) {
        return this.loadFile(slug, "en_US");
      }
      this.translations.set(`${slug}.${loc}`, {});
      return {};
    }

    try {
      const raw = readFileSync(langFile, "utf-8");
      const strings: I18nStrings = JSON.parse(raw);
      this.translations.set(`${slug}.${loc}`, strings);
      return strings;
    } catch {
      this.translations.set(`${slug}.${loc}`, {});
      return {};
    }
  }

  reloadAll(slug?: string): void {
    if (slug) {
      this.loadTranslations(slug);
      return;
    }
  }

  __(slug: string, text: string, locale?: string): string {
    const loc = locale ?? this.defaultLocale;
    const key = `${slug}.${loc}`;

    if (!this.translations.has(key)) {
      this.loadTranslations(slug, loc);
    }

    const strings = this.translations.get(key);
    if (strings && strings[text] !== undefined) {
      return strings[text];
    }

    return text;
  }

  _n(slug: string, single: string, plural: string, count: number, locale?: string): string {
    const text = count === 1 ? single : plural;
    return this.__(slug, text, locale).replace("%d", String(count));
  }

  getLocale(): string {
    return this.defaultLocale;
  }

  setLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  getAvailableLocales(slug: string): string[] {
    const langDir = join(this.pluginsDir, slug, "languages");
    if (!existsSync(langDir)) return [];

    try {
      const files = readdirSync(langDir);
      return files
        .filter((f: string) => f.endsWith(".json"))
        .map((f: string) => f.replace(".json", ""));
    } catch {
      return [];
    }
  }

  private loadFile(slug: string, locale: string): I18nStrings {
    const langDir = join(this.pluginsDir, slug, "languages");
    const langFile = join(langDir, `${locale}.json`);

    if (!existsSync(langFile)) return {};

    try {
      const raw = readFileSync(langFile, "utf-8");
      const strings: I18nStrings = JSON.parse(raw);
      this.translations.set(`${slug}.${locale}`, strings);
      return strings;
    } catch {
      return {};
    }
  }
}
