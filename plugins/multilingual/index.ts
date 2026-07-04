import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  enabled: boolean;
  isDefault: boolean;
  flag: string;
}

interface Translation {
  id: string;
  contentType: string;
  contentId: string;
  language: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  translatedAt: string;
  translatedBy: 'manual' | 'auto';
}

interface TranslationMemory {
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translatedText: string;
  hits: number;
}

const supportedLanguages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    locale: 'en_US',
    dir: 'ltr',
    enabled: true,
    isDefault: true,
    flag: '🇺🇸',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    locale: 'fr_FR',
    dir: 'ltr',
    enabled: true,
    isDefault: false,
    flag: '🇫🇷',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    locale: 'de_DE',
    dir: 'ltr',
    enabled: true,
    isDefault: false,
    flag: '🇩🇪',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    locale: 'es_ES',
    dir: 'ltr',
    enabled: true,
    isDefault: false,
    flag: '🇪🇸',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    locale: 'it_IT',
    dir: 'ltr',
    enabled: false,
    isDefault: false,
    flag: '🇮🇹',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    locale: 'pt_BR',
    dir: 'ltr',
    enabled: false,
    isDefault: false,
    flag: '🇧🇷',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    locale: 'ru_RU',
    dir: 'ltr',
    enabled: false,
    isDefault: false,
    flag: '🇷🇺',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    locale: 'ja_JP',
    dir: 'ltr',
    enabled: false,
    isDefault: false,
    flag: '🇯🇵',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    locale: 'zh_CN',
    dir: 'ltr',
    enabled: false,
    isDefault: false,
    flag: '🇨🇳',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    locale: 'ar_SA',
    dir: 'rtl',
    enabled: false,
    isDefault: false,
    flag: '🇸🇦',
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    locale: 'he_IL',
    dir: 'rtl',
    enabled: false,
    isDefault: false,
    flag: '🇮🇱',
  },
];

const translations: Translation[] = [];
const translationMemory: TranslationMemory[] = [];

async function translateText(
  context: PluginContext,
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  // Check translation memory first
  const cached = translationMemory.find(
    (m) =>
      m.sourceText.toLowerCase() === text.toLowerCase() &&
      m.sourceLang === sourceLang &&
      m.targetLang === targetLang,
  );
  if (cached) {
    cached.hits++;
    return cached.translatedText;
  }

  // Try DeepL API
  const apiKey = process.env.DEEPL_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetLang.toUpperCase(),
          source_lang: sourceLang?.toUpperCase(),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { translations: Array<{ text: string }> };
        const translatedText = data.translations[0].text;

        // Store in translation memory
        translationMemory.push({
          sourceLang,
          targetLang,
          sourceText: text,
          translatedText,
          hits: 1,
        });

        return translatedText;
      }
      context.logger.warn(`[DeepL] API error: ${response.status} ${response.statusText}`);
    } catch (err) {
      context.logger.warn(
        `[DeepL] Request failed: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  }

  // Fallback: no DeepL API key or API error
  context.logger.warn(
    `[Multilingual] No DeepL API key configured — cannot translate "${text.slice(0, 40)}..."`,
  );
  return '';
}

function getBrowserLanguage(): string {
  return 'en';
}

function detectLanguage(path: string): string {
  const match = path.match(/^\/([a-z]{2}(?:-[A-Z]{2})?)(?:\/|$)/);
  if (match) return match[1].toLowerCase();
  return '';
}

function localizeUrl(path: string, targetLang: string): string {
  const existingLang = detectLanguage(path);
  const base = existingLang ? path.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?/, '') : path;
  return targetLang === 'en' ? (base === '' ? '/' : base) : `/${targetLang}${base}`;
}

function generateLanguageSwitcherHtml(activeLang: string, languages: Language[]): string {
  const items = languages
    .filter((l) => l.enabled)
    .map((l) => {
      const isActive = l.code === activeLang;
      const url = localizeUrl('/', l.code);
      return `<li class="lang-${l.code}${isActive ? ' active' : ''}">
        <a href="${url}" hreflang="${l.code}" lang="${l.code}" dir="${l.dir}">
          ${l.flag} ${l.nativeName}
        </a>
      </li>`;
    })
    .join('\n');
  return `<ul class="language-switcher">\n${items}\n</ul>`;
}

function applyRtlSupport(html: string, lang: string): string {
  const language = supportedLanguages.find((l) => l.code === lang);
  if (language?.dir === 'rtl') {
    return html
      .replace('<html', '<html dir="rtl"')
      .replace('</head>', '<link rel="stylesheet" href="/assets/css/rtl.css">\n</head>');
  }
  return html;
}

export const manifest = {
  slug: 'multilingual',
  name: 'Multilingual',
  version: '0.1.0',
  description:
    'Multi-language support with language switcher, automatic translation, locale detection, and RTL support',
  permissions: [
    'settings:read',
    'settings:write',
    'content:read',
    'content:write',
    'hooks:content.render',
  ],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const activeLanguages = supportedLanguages.filter((l) => l.enabled);
    let autoTranslateEnabled = false;
    let autoTranslateProvider: 'deepl' | 'google' | 'none' = 'none';
    let localeDetectionEnabled = true;
    let defaultLanguage = activeLanguages.find((l) => l.isDefault) || activeLanguages[0];

    context.hooks.addFilter('content:render', async (html: string, ...args: unknown[]) => {
      try {
        const meta = args[0] as { lang?: string; slug?: string; title?: string } | undefined;
        const currentLang = meta?.lang || defaultLanguage.code;
        const path = meta?.slug || '/';

        let result = html;
        result = result.replace('<html', `<html lang="${currentLang}"`);
        result = applyRtlSupport(result, currentLang);
        result = result.replace(
          '</head>',
          `<link rel="alternate" hreflang="x-default" href="/" />\n${activeLanguages
            .map(
              (l) =>
                `  <link rel="alternate" hreflang="${l.code}" href="${localizeUrl(path, l.code)}" />`,
            )
            .join('\n')}\n</head>`,
        );
        return result;
      } catch (err) {
        context.logger.error(
          `content:render error: ${err instanceof Error ? err.message : String(err)}`,
        );
        return html;
      }
    });

    context.hooks.addAction('multilingual:content:add', async (data: unknown) => {
      try {
        const { contentType, contentId, language, title, content, excerpt } = data as {
          contentType: string;
          contentId: string;
          language: string;
          title: string;
          content?: string;
          excerpt?: string;
        };
        if (!contentType || !contentId || !language || !title) {
          context.logger.warn('Multilingual: Missing required fields for translation');
          return;
        }
        const existing = translations.findIndex(
          (t) =>
            t.contentType === contentType && t.contentId === contentId && t.language === language,
        );
        const translation: Translation = {
          id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          contentType,
          contentId,
          language,
          title,
          slug: title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          content: content || '',
          excerpt: excerpt || '',
          metaTitle: title,
          metaDescription: excerpt || title,
          translatedAt: new Date().toISOString(),
          translatedBy: 'manual',
        };
        if (existing >= 0) {
          translations[existing] = translation;
          context.logger.log(
            `Multilingual: Updated ${language} translation for ${contentType}/${contentId}`,
          );
        } else {
          translations.push(translation);
          context.logger.log(
            `Multilingual: Added ${language} translation for ${contentType}/${contentId}`,
          );
        }
      } catch (err) {
        context.logger.error(
          `multilingual:content:add error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:auto:translate', async (data: unknown) => {
      try {
        const { contentType, contentId, title, content, targetLanguages } = data as {
          contentType: string;
          contentId: string;
          title: string;
          content?: string;
          targetLanguages?: string[];
        };
        if (!contentType || !contentId || !title) {
          context.logger.warn('Multilingual: Auto-translate called without required fields');
          return;
        }
        if (!autoTranslateEnabled || autoTranslateProvider === 'none') {
          context.logger.warn('Multilingual: Auto-translate is not configured');
          return;
        }
        const langs =
          targetLanguages || activeLanguages.filter((l) => !l.isDefault).map((l) => l.code);
        for (const lang of langs) {
          const translatedTitle = await translateText(context, title, defaultLanguage.code, lang);
          const translatedContent = content
            ? await translateText(context, content, defaultLanguage.code, lang)
            : '';
          const translatedExcerpt = content?.slice(0, 200)
            ? await translateText(context, content.slice(0, 200), defaultLanguage.code, lang)
            : '';
          translations.push({
            id: `tr-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            contentType,
            contentId,
            language: lang,
            title: translatedTitle,
            slug: translatedTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
            content: translatedContent,
            excerpt: translatedExcerpt,
            metaTitle: translatedTitle,
            metaDescription: translatedExcerpt || translatedTitle,
            translatedAt: new Date().toISOString(),
            translatedBy: 'auto',
          });
        }
        context.logger.log(
          `Multilingual: Auto-translated "${title}" to ${langs.length} languages via ${autoTranslateProvider}`,
        );
      } catch (err) {
        context.logger.error(
          `multilingual:auto:translate error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:locale:detect', async (data: unknown) => {
      try {
        if (!localeDetectionEnabled) return;
        const { headers, callback } = data as {
          headers?: Record<string, string>;
          callback?: (lang: string, redirectUrl: string) => void;
        };
        const acceptLang = headers?.['accept-language'] || '';
        const browserLangs = acceptLang
          .split(',')
          .map((l) => l.split(';')[0].trim().slice(0, 2).toLowerCase());
        for (const bl of browserLangs) {
          const matched = activeLanguages.find((l) => l.code === bl);
          if (matched && !matched.isDefault) {
            const currentPath = (data as any).path || '/';
            const currentLang = detectLanguage(currentPath);
            if (!currentLang) {
              const redirectUrl = localizeUrl(currentPath, matched.code);
              if (callback) callback(matched.code, redirectUrl);
            }
            break;
          }
        }
      } catch (err) {
        context.logger.error(
          `multilingual:locale:detect error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:language:switcher:render', async (data: unknown) => {
      try {
        const { lang, position } = data as { lang?: string; position?: 'widget' | 'menu' | 'both' };
        const currentLang = lang || defaultLanguage.code;
        const html = generateLanguageSwitcherHtml(currentLang, supportedLanguages);
        (data as any).html = html;
      } catch (err) {
        context.logger.error(
          `multilingual:language:switcher:render error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:language:activate', async (data: unknown) => {
      try {
        const { code } = data as { code: string };
        const lang = supportedLanguages.find((l) => l.code === code);
        if (!lang) {
          context.logger.warn(`Multilingual: Language ${code} not found`);
          return;
        }
        lang.enabled = true;
        activeLanguages.push(lang);
        context.logger.log(`Multilingual: Activated language ${lang.name} (${code})`);
      } catch (err) {
        context.logger.error(
          `multilingual:language:activate error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:language:deactivate', async (data: unknown) => {
      try {
        const { code } = data as { code: string };
        const lang = supportedLanguages.find((l) => l.code === code);
        if (!lang) {
          context.logger.warn(`Multilingual: Language ${code} not found`);
          return;
        }
        if (lang.isDefault) {
          context.logger.warn('Multilingual: Cannot deactivate default language');
          return;
        }
        lang.enabled = false;
        const idx = activeLanguages.findIndex((l) => l.code === code);
        if (idx >= 0) activeLanguages.splice(idx, 1);
        context.logger.log(`Multilingual: Deactivated language ${lang.name} (${code})`);
      } catch (err) {
        context.logger.error(
          `multilingual:language:deactivate error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('multilingual:stats', async (data: unknown) => {
      try {
        const callback = (data as any)?.callback;
        const stats = {
          totalLanguages: supportedLanguages.length,
          activeLanguages: activeLanguages.length,
          totalTranslations: translations.length,
          manualTranslations: translations.filter((t) => t.translatedBy === 'manual').length,
          autoTranslations: translations.filter((t) => t.translatedBy === 'auto').length,
          rtlLanguages: supportedLanguages.filter((l) => l.dir === 'rtl').length,
          translationMemoryEntries: translationMemory.length,
        };
        if (callback) callback(stats);
      } catch (err) {
        context.logger.error(
          `multilingual:stats error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'Multilingual Overview',
          priority: 9,
          content: `<div class="multilingual-widget">
          <p>Active Languages: ${activeLanguages.length}/${supportedLanguages.length}</p>
          <p>Translations: ${translations.length} (${translations.filter((t) => t.translatedBy === 'manual').length} manual, ${translations.filter((t) => t.translatedBy === 'auto').length} auto)</p>
          <p>Default: ${defaultLanguage.name}</p>
          <p>Auto-Translate: ${autoTranslateEnabled ? autoTranslateProvider.toUpperCase() : 'Disabled'}</p>
          <p>Locale Detection: ${localeDetectionEnabled ? 'Enabled' : 'Disabled'}</p>
          <p>RTL Languages: ${supportedLanguages.filter((l) => l.dir === 'rtl').length}</p>
        </div>`,
        });
      } catch (err) {
        context.logger.error(
          `admin:dashboard:render error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      try {
        (data as any).sections = (data as any).sections || [];
        (data as any).sections.push({
          slug: 'multilingual',
          title: 'Multilingual',
          fields: [
            {
              name: 'autoTranslateEnabled',
              label: 'Auto-Translate',
              type: 'boolean',
              value: autoTranslateEnabled,
            },
            {
              name: 'autoTranslateProvider',
              label: 'Translation Provider',
              type: 'select',
              options: ['deepl', 'google'],
              value: autoTranslateProvider,
            },
            {
              name: 'localeDetectionEnabled',
              label: 'Locale Detection',
              type: 'boolean',
              value: localeDetectionEnabled,
            },
            {
              name: 'defaultLanguage',
              label: 'Default Language',
              type: 'select',
              options: supportedLanguages.map((l) => l.code),
              value: defaultLanguage.code,
            },
          ],
        });
      } catch (err) {
        context.logger.error(
          `admin:settings:render error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    context.logger.log('Multilingual plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Multilingual plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Multilingual plugin deactivated');
  },
};
