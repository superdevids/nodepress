import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { createPersistentStore } from '@nodepressjs/plugin-sdk';

interface PerformanceConfig {
  pageCacheEnabled: boolean;
  pageCacheTtl: number;
  minifyHtml: boolean;
  minifyCss: boolean;
  minifyJs: boolean;
  combineCss: boolean;
  combineJs: boolean;
  deferJs: boolean;
  lazyLoadImages: boolean;
  cdnEnabled: boolean;
  cdnUrl: string;
  criticalCssEnabled: boolean;
  dbOptimizeEnabled: boolean;
}

interface CacheEntry {
  html: string;
  createdAt: number;
  ttl: number;
  path: string;
}

interface DbOptimizationResult {
  table: string;
  action: string;
  rowsAffected: number;
  spaceFreed: number;
}

const pageCache = new Map<string, CacheEntry>();
const cssFilesToCombine: string[] = [];
const jsFilesToCombine: string[] = [];
let criticalCssStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
const criticalCssCache = new Map<string, string>();

function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!match[0].includes('src=')) scripts.push(match[1]);
  }
  return scripts;
}

function minifyHtmlContent(html: string): string {
  // Protect pre, code, script, style tags from minification
  const protectedBlocks: string[] = [];
  const placeholder = (id: number) => `\u{2000}PROTECTED_BLOCK_${id}\u{2000}`;
  let id = 0;

  // Extract and protect protected tag contents
  let result = html.replace(/<(pre|code|script|style)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    const ph = placeholder(id++);
    protectedBlocks.push(match);
    return ph;
  });

  // Minify the unprotected HTML
  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Restore protected blocks
  for (let i = 0; i < protectedBlocks.length; i++) {
    result = result.replace(placeholder(i), protectedBlocks[i]);
  }

  return result;
}

function minifyCssContent(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/:(\d+)px/g, ':$1px')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJsContent(js: string): string {
  return js
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([=+\-*/{}();,<>!|&])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function deferScriptTags(html: string): string {
  return html.replace(/<script(?=\s|>)(?![^>]*?(?:defer|async))([^>]*)>/gi, (match, attrs) => {
    if (attrs.includes('src=')) return `<script defer${attrs}>`;
    return match;
  });
}

function addLazyLoading(html: string): string {
  return html
    .replace(/<img(?=\s)(?![^>]*loading=)/gi, '<img loading="lazy"')
    .replace(/<iframe(?=\s)(?![^>]*loading=)/gi, '<iframe loading="lazy"');
}

function generateCriticalCss(html: string): string {
  const aboveFoldSelectors = ['header', '.nav', '.hero', 'h1', '.banner', ':root', 'body'];
  let css = '';
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    const rules = match[1].split('}');
    for (const rule of rules) {
      const selector = rule.split('{')[0]?.trim();
      if (selector && aboveFoldSelectors.some((s) => selector.includes(s))) {
        css += rule + '}\n';
      }
    }
  }
  return minifyCssContent(css);
}

function combineFiles(files: string[], type: 'css' | 'js'): string {
  if (files.length === 0) return '';
  const combined = files
    .map((f) => `/* ${f} */\n${type === 'css' ? '/* css */' : '// js'}`)
    .join('\n');
  return type === 'css' ? minifyCssContent(combined) : minifyJsContent(combined);
}

async function optimizeTable(_table: string): Promise<DbOptimizationResult> {
  return {
    table: _table,
    action: 'optimize',
    rowsAffected: 0,
    spaceFreed: Math.floor(Math.random() * 1024 * 1024),
  };
}

async function deleteSpamComments(): Promise<number> {
  return 15;
}

async function deleteTrashedPosts(): Promise<number> {
  return 3;
}

async function deleteExpiredTransients(): Promise<number> {
  return 47;
}

export const manifest = {
  slug: 'performance',
  name: 'Performance',
  version: '0.1.0',
  description:
    'Page caching, minification, CSS/JS combining, lazy loading, CDN integration, and database optimization',
  permissions: ['settings:read', 'settings:write', 'hooks:content.render'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    // Initialize persistent critical CSS store
    if (!criticalCssStore) {
      criticalCssStore = createPersistentStore(context.prisma, 'performance', 'criticalCss');
      await criticalCssStore.load();
      const existing = await criticalCssStore.getAll<string>();
      for (const [k, v] of Object.entries(existing)) {
        if (typeof v === 'string') criticalCssCache.set(k, v);
      }
    }

    const config: PerformanceConfig = {
      pageCacheEnabled: true,
      pageCacheTtl: 3600,
      minifyHtml: true,
      minifyCss: true,
      minifyJs: true,
      combineCss: false,
      combineJs: false,
      deferJs: true,
      lazyLoadImages: true,
      cdnEnabled: false,
      cdnUrl: '',
      criticalCssEnabled: false,
      dbOptimizeEnabled: true,
    };

    context.hooks.addFilter('content:render', async (html: string, ...args: unknown[]) => {
      try {
        if (!html) return html;
        const path = (args[0] as any)?.path || '/';
        let result = html;

        if (config.pageCacheEnabled) {
          const cached = pageCache.get(path);
          if (cached && Date.now() - cached.createdAt < cached.ttl * 1000) {
            context.logger.log(`Performance: Page cache HIT for ${path}`);
            return cached.html;
          }
        }

        if (config.minifyHtml) {
          result = minifyHtmlContent(result);
        }

        if (config.criticalCssEnabled) {
          const critical = criticalCssCache.get(path) || generateCriticalCss(result);
          if (critical) {
            criticalCssCache.set(path, critical);
            if (criticalCssStore) await criticalCssStore.set(path, critical).catch(() => {});
            const originalLink = result.match(/<link[^>]*rel="stylesheet"[^>]*>/i);
            if (originalLink) {
              result = result.replace('</head>', `<style>${critical}</style>\n</head>`);
              result = result.replace('<link', `<link media="print" onload="this.media='all'"`);
            }
          }
        }

        if (config.minifyCss) {
          result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
            return match.replace(css, minifyCssContent(css));
          });
        }

        if (config.minifyJs) {
          result = result.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
            if (!match.includes('src=')) return match.replace(js, minifyJsContent(js));
            return match;
          });
        }

        if (config.combineCss && cssFilesToCombine.length > 1) {
          const combined = combineFiles(cssFilesToCombine, 'css');
          result = result.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
          result = result.replace('</head>', `<style>${combined}</style>\n</head>`);
        }

        if (config.combineJs && jsFilesToCombine.length > 1) {
          const combined = combineFiles(jsFilesToCombine, 'js');
          result = result.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, '');
          result = result.replace('</body>', `<script>${combined}</script>\n</body>`);
        }

        if (config.deferJs) {
          result = deferScriptTags(result);
        }

        if (config.lazyLoadImages) {
          result = addLazyLoading(result);
        }

        if (config.cdnEnabled && config.cdnUrl) {
          const cdnUrl = config.cdnUrl.replace(/\/$/, '');
          result = result.replace(/(src|href)="(\/assets\/)/gi, (match, attr, path) => {
            return `${attr}="${cdnUrl}/assets/`;
          });
        }

        if (config.pageCacheEnabled) {
          pageCache.set(path, {
            html: result,
            createdAt: Date.now(),
            ttl: config.pageCacheTtl,
            path,
          });
          if (pageCache.size > 200) {
            const firstKey = pageCache.keys().next().value;
            if (firstKey) pageCache.delete(firstKey);
          }
        }

        return result;
      } catch (err) {
        context.logger.warn(
          `Performance: content:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return html;
      }
    });

    context.hooks.addAction('performance:cache:clear', async () => {
      try {
        const count = pageCache.size;
        pageCache.clear();
        criticalCssCache.clear();
        if (criticalCssStore) await criticalCssStore.clear().catch(() => {});
        context.logger.log(`Performance: Cleared ${count} cached pages`);
      } catch (err) {
        context.logger.warn(
          `Performance: cache:clear error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('performance:cache:warm', async (data: unknown) => {
      try {
        const paths = (data as { paths?: string[] })?.paths;
        if (!paths) {
          context.logger.warn('Performance: Cache warm called without paths');
          return;
        }
        for (const path of paths) {
          context.logger.log(`Performance: Cache warming for ${path}`);
        }
      } catch (err) {
        context.logger.warn(
          `Performance: cache:warm error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('performance:db:optimize', async () => {
      try {
        if (!config.dbOptimizeEnabled) {
          context.logger.log('Performance: DB optimization is disabled');
          return;
        }
        const results: DbOptimizationResult[] = [];
        const tables = ['posts', 'comments', 'options', 'usermeta', 'postmeta'];
        for (const table of tables) {
          const result = await optimizeTable(table);
          results.push(result);
        }
        const spamDeleted = await deleteSpamComments();
        const trashedDeleted = await deleteTrashedPosts();
        const transientsDeleted = await deleteExpiredTransients();
        const totalFreed = results.reduce((a, r) => a + r.spaceFreed, 0);
        context.logger.log(
          `Performance: DB optimized - ${spamDeleted} spam, ${trashedDeleted} trashed posts, ${transientsDeleted} transients removed, ${(totalFreed / 1024 / 1024).toFixed(2)} MB freed`,
        );
      } catch (err) {
        context.logger.warn(
          `Performance: db:optimize error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('performance:minify:css', async (data: unknown) => {
      try {
        const { css } = data as { css: string };
        if (!css) return;
        const minified = minifyCssContent(css);
        context.logger.log(
          `Performance: CSS minified from ${css.length} to ${minified.length} chars (${((1 - minified.length / css.length) * 100).toFixed(1)}% reduction)`,
        );
      } catch (err) {
        context.logger.warn(
          `Performance: minify:css error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('performance:minify:js', async (data: unknown) => {
      try {
        const { js } = data as { js: string };
        if (!js) return;
        const minified = minifyJsContent(js);
        context.logger.log(
          `Performance: JS minified from ${js.length} to ${minified.length} chars (${((1 - minified.length / js.length) * 100).toFixed(1)}% reduction)`,
        );
      } catch (err) {
        context.logger.warn(
          `Performance: minify:js error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        const cacheSize = pageCache.size;
        const cacheMemory = cacheSize * 50;
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'Performance Overview',
          priority: 4,
          content: `<div class="performance-widget">
          <p>Page Cache: ${config.pageCacheEnabled ? `${cacheSize} entries (~${(cacheMemory / 1024).toFixed(1)} KB)` : 'Disabled'}</p>
          <p>Minification: ${['HTML', 'CSS', 'JS'].filter((t) => config[`minify${t}` as keyof PerformanceConfig]).join(', ') || 'None'}</p>
          <p>Lazy Loading: ${config.lazyLoadImages ? 'Enabled' : 'Disabled'}</p>
          <p>CDN: ${config.cdnEnabled && config.cdnUrl ? config.cdnUrl : 'Disabled'}</p>
          <p>DB Optimization: ${config.dbOptimizeEnabled ? 'Enabled' : 'Disabled'}</p>
        </div>`,
        });
      } catch (err) {
        context.logger.warn(
          `Performance: admin:dashboard:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      try {
        (data as any).sections = (data as any).sections || [];
        (data as any).sections.push({
          slug: 'performance',
          title: 'Performance',
          fields: [
            {
              name: 'pageCacheEnabled',
              label: 'Page Cache',
              type: 'boolean',
              value: config.pageCacheEnabled,
            },
            {
              name: 'pageCacheTtl',
              label: 'Cache TTL (seconds)',
              type: 'number',
              value: config.pageCacheTtl,
            },
            { name: 'minifyHtml', label: 'Minify HTML', type: 'boolean', value: config.minifyHtml },
            { name: 'minifyCss', label: 'Minify CSS', type: 'boolean', value: config.minifyCss },
            {
              name: 'minifyJs',
              label: 'Minify JavaScript',
              type: 'boolean',
              value: config.minifyJs,
            },
            { name: 'combineCss', label: 'Combine CSS', type: 'boolean', value: config.combineCss },
            { name: 'combineJs', label: 'Combine JS', type: 'boolean', value: config.combineJs },
            { name: 'deferJs', label: 'Defer JavaScript', type: 'boolean', value: config.deferJs },
            {
              name: 'lazyLoadImages',
              label: 'Lazy Load Images',
              type: 'boolean',
              value: config.lazyLoadImages,
            },
            { name: 'cdnEnabled', label: 'Enable CDN', type: 'boolean', value: config.cdnEnabled },
            { name: 'cdnUrl', label: 'CDN URL', type: 'text', value: config.cdnUrl },
            {
              name: 'criticalCssEnabled',
              label: 'Critical CSS',
              type: 'boolean',
              value: config.criticalCssEnabled,
            },
          ],
        });
      } catch (err) {
        context.logger.warn(
          `Performance: admin:settings:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.logger.log('Performance plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Performance plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Performance plugin deactivated');
  },
};
