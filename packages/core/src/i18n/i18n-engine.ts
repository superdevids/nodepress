import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { HookRegistry } from "../plugin/hook-registry.js";

export interface I18nOptions {
  defaultLocale?: string;
  fallbackLocale?: string;
  languagesDir?: string;
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur", "yi", "dv"]);

export class I18nEngine {
  private translations: Map<string, Map<string, string>> = new Map();
  private localeInfo: Map<string, LocaleInfo> = new Map();
  private defaultLocale: string;
  private fallbackLocale: string;
  private languagesDir: string;
  private hooks: HookRegistry | null = null;
  private loadedLocales: Set<string> = new Set();

  constructor(options: I18nOptions = {}) {
    this.defaultLocale = options.defaultLocale || "en_US";
    this.fallbackLocale = options.fallbackLocale || "en_US";
    this.languagesDir = options.languagesDir || join(process.cwd(), "languages");
    this.registerBuiltinLocales();
  }

  setHookRegistry(hooks: HookRegistry): void {
    this.hooks = hooks;
  }

  async __(text: string, locale?: string, ...args: unknown[]): Promise<string> {
    const loc = locale || this.defaultLocale;
    let translated = this.translate(text, loc);

    if (this.hooks) {
      translated = await this.hooks.applyFilter("i18n.translate", translated, text, loc) as string;
    }

    if (args.length > 0) {
      return this.sprintf(translated, ...args);
    }

    return translated;
  }

  async _n(singular: string, plural: string, count: number, locale?: string): Promise<string> {
    const loc = locale || this.defaultLocale;
    const key = count === 1 ? singular : plural;
    let translated = this.translate(key, loc);

    if (this.hooks) {
      translated = await this.hooks.applyFilter("i18n.translate", translated, key, loc) as string;
    }

    if (translated.includes("%d")) {
      return translated.replace("%d", String(count));
    }

    return translated;
  }

  async _x(text: string, context: string, locale?: string): Promise<string> {
    const loc = locale || this.defaultLocale;
    const contextKey = `${context}\u0004${text}`;

    const translations = this.getTranslations(loc);
    let translated = translations.get(contextKey) || translations.get(text) || text;

    if (this.hooks) {
      translated = await this.hooks.applyFilter("i18n.translate", translated, text, loc, context) as string;
    }

    return translated;
  }

  loadLocale(locale: string): void {
    if (this.loadedLocales.has(locale)) return;

    const filePath = join(this.languagesDir, `${locale}.json`);
    if (!existsSync(filePath)) return;

    try {
      const content = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, string>;
      const map = new Map<string, string>();

      for (const [key, value] of Object.entries(content)) {
        map.set(key, value);
      }

      this.translations.set(locale, map);
      this.loadedLocales.add(locale);
    } catch {
      throw new Error(`Failed to load locale file: ${filePath}`);
    }
  }

  loadAllLocales(): void {
    if (!existsSync(this.languagesDir)) return;

    const files = readdirSync(this.languagesDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const locale = file.replace(".json", "");
        this.loadLocale(locale);
      }
    }
  }

  getLocale(locale?: string): LocaleInfo {
    const code = locale || this.defaultLocale;
    return this.localeInfo.get(code) || {
      code,
      name: code,
      nativeName: code,
      isRtl: RTL_LOCALES.has(code.split("_")[0]),
    };
  }

  getAvailableLocales(): LocaleInfo[] {
    return Array.from(this.localeInfo.values());
  }

  getLoadedLocales(): string[] {
    return Array.from(this.loadedLocales);
  }

  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  detectLocale(acceptLanguage?: string, userPreference?: string): string {
    if (userPreference && this.loadedLocales.has(userPreference)) {
      return userPreference;
    }

    if (acceptLanguage) {
      const preferred = acceptLanguage
        .split(",")
        .map((l) => {
          const [lang, q = "1"] = l.trim().split(";q=");
          return { lang: lang.replace(/-/g, "_"), q: parseFloat(q) };
        })
        .sort((a, b) => b.q - a.q);

      for (const { lang } of preferred) {
        if (this.loadedLocales.has(lang)) return lang;
        const short = lang.split("_")[0];
        for (const loaded of this.loadedLocales) {
          if (loaded.startsWith(short)) return loaded;
        }
      }
    }

    return this.defaultLocale;
  }

  addTranslation(locale: string, key: string, value: string): void {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }
    this.translations.get(locale)!.set(key, value);
  }

  registerLocale(info: LocaleInfo): void {
    this.localeInfo.set(info.code, info);
  }

  isRtl(locale?: string): boolean {
    const code = locale || this.defaultLocale;
    return RTL_LOCALES.has(code.split("_")[0]);
  }

  getTranslations(locale: string): Map<string, string> {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, new Map());
    }
    return this.translations.get(locale)!;
  }

  getAllTranslations(locale: string): Record<string, string> {
    const map = this.getTranslations(locale);
    const result: Record<string, string> = {};
    for (const [key, value] of map) {
      result[key] = value;
    }
    return result;
  }

  private translate(text: string, locale: string): string {
    this.loadLocale(locale);

    const translations = this.translations.get(locale);
    if (translations?.has(text)) {
      return translations.get(text)!;
    }

    if (this.fallbackLocale && locale !== this.fallbackLocale) {
      this.loadLocale(this.fallbackLocale);
      const fallback = this.translations.get(this.fallbackLocale);
      if (fallback?.has(text)) {
        return fallback.get(text)!;
      }
    }

    return text;
  }

  private sprintf(str: string, ...args: unknown[]): string {
    let result = str;
    let i = 0;

    result = result.replace(/%[sd]/g, () => {
      const val = args[i++];
      return val !== undefined ? String(val) : "";
    });

    result = result.replace(/%(\d+)\$[sd]/g, (_match, index: string) => {
      const val = args[parseInt(index, 10) - 1];
      return val !== undefined ? String(val) : "";
    });

    return result;
  }

  private registerBuiltinLocales(): void {
    const locales: LocaleInfo[] = [
      { code: "en_US", name: "English (US)", nativeName: "English (US)", isRtl: false },
      { code: "id_ID", name: "Indonesian", nativeName: "Bahasa Indonesia", isRtl: false },
      { code: "ar", name: "Arabic", nativeName: "العربية", isRtl: true },
      { code: "de_DE", name: "German", nativeName: "Deutsch", isRtl: false },
      { code: "es_ES", name: "Spanish", nativeName: "Español", isRtl: false },
      { code: "fr_FR", name: "French", nativeName: "Français", isRtl: false },
      { code: "ja", name: "Japanese", nativeName: "日本語", isRtl: false },
      { code: "ko_KR", name: "Korean", nativeName: "한국어", isRtl: false },
      { code: "pt_BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", isRtl: false },
      { code: "ru_RU", name: "Russian", nativeName: "Русский", isRtl: false },
      { code: "tr_TR", name: "Turkish", nativeName: "Türkçe", isRtl: false },
      { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", isRtl: false },
      { code: "zh_CN", name: "Chinese (Simplified)", nativeName: "简体中文", isRtl: false },
      { code: "zh_TW", name: "Chinese (Traditional)", nativeName: "繁體中文", isRtl: false },
    ];

    for (const info of locales) {
      this.registerLocale(info);
    }
  }
}
