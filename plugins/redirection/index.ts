import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { createPersistentStore } from '@nodepressjs/plugin-sdk';

interface RedirectRule {
  id: string;
  source: string;
  target: string;
  type: 301 | 302 | 307 | 308;
  matchType: 'exact' | 'prefix' | 'regex';
  enabled: boolean;
  priority: number;
  description: string;
  hits: number;
  lastHit: number | null;
  createdAt: number;
}

interface RedirectLogEntry {
  id: string;
  ruleId: string;
  source: string;
  target: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  referrer: string;
  timestamp: number;
}

interface NotFoundEntry {
  path: string;
  hits: number;
  firstSeen: number;
  lastSeen: number;
  referrers: string[];
}

let redirectRulesStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
let redirectLogStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
let notFoundStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
const redirectRulesCache: RedirectRule[] = [];
const redirectLogCache: RedirectLogEntry[] = [];
const notFoundCache = new Map<string, NotFoundEntry>();

function generateId(): string {
  return `red-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function matchPath(
  source: string,
  pathname: string,
  matchType: 'exact' | 'prefix' | 'regex',
): boolean {
  switch (matchType) {
    case 'exact': {
      if (source.endsWith('/') && !pathname.endsWith('/')) return pathname + '/' === source;
      if (!source.endsWith('/') && pathname.endsWith('/')) return pathname === source + '/';
      return pathname === source;
    }
    case 'prefix': {
      const wildcard = source.endsWith('/*') ? source.slice(0, -2) : source;
      return pathname.startsWith(wildcard);
    }
    case 'regex': {
      try {
        return new RegExp(source, 'i').test(pathname);
      } catch {
        return false;
      }
    }
  }
}

function applyRedirect(
  source: string,
  target: string,
  matchType: 'exact' | 'prefix' | 'regex',
  pathname: string,
): string {
  if (matchType === 'exact') return target;
  if (matchType === 'prefix') {
    const wildcard = source.endsWith('/*') ? source.slice(0, -1) : source;
    const suffix = pathname.slice(wildcard.length);
    return target.endsWith('/') && suffix.startsWith('/')
      ? target + suffix.slice(1)
      : target + suffix;
  }
  if (matchType === 'regex') {
    try {
      return pathname.replace(new RegExp(source, 'i'), target);
    } catch {
      return target;
    }
  }
  return target;
}

function generateCsvExport(rules: RedirectRule[]): string {
  const lines = ['source,target,type,matchType,enabled,description'];
  for (const rule of rules) {
    lines.push(
      `${rule.source},${rule.target},${rule.type},${rule.matchType},${rule.enabled},"${rule.description}"`,
    );
  }
  return lines.join('\n');
}

function parseCsvImport(
  csv: string,
): Omit<RedirectRule, 'id' | 'hits' | 'lastHit' | 'createdAt'>[] {
  const lines = csv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('source,'));
  const rules: Omit<RedirectRule, 'id' | 'hits' | 'lastHit' | 'createdAt'>[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    rules.push({
      source: parts[0].trim(),
      target: parts[1].trim(),
      type: parseInt(parts[2], 10) as 301 | 302,
      matchType: (parts[3]?.trim() as 'exact' | 'prefix' | 'regex') || 'exact',
      enabled: parts[4]?.trim() === 'true',
      priority: 50,
      description: parts[5]?.replace(/^"|"$/g, '').trim() || '',
    });
  }
  return rules;
}

export const manifest = {
  slug: 'redirection',
  name: 'Redirection',
  version: '0.1.0',
  description: '301/302 redirect management, 404 tracking, regex matching, and redirect analytics',
  permissions: ['settings:read', 'settings:write', 'hooks:content.render'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    // Initialize persistent stores
    if (!redirectRulesStore) {
      redirectRulesStore = createPersistentStore(context.prisma, 'redirection', 'rules');
      redirectLogStore = createPersistentStore(context.prisma, 'redirection', 'log');
      notFoundStore = createPersistentStore(context.prisma, 'redirection', 'notfound');
      await Promise.all([redirectRulesStore.load(), redirectLogStore.load(), notFoundStore.load()]);

      // Load existing rules, or seed defaults
      const loadedRules = await redirectRulesStore.getAll<RedirectRule>();
      if (Object.keys(loadedRules).length > 0) {
        for (const v of Object.values(loadedRules))
          if (v) redirectRulesCache.push(v as RedirectRule);
      } else {
        const defaults: RedirectRule[] = [
          {
            id: 'redirect-old-blog',
            source: '/old-blog/*',
            target: '/blog/',
            type: 301,
            matchType: 'prefix',
            enabled: true,
            priority: 10,
            description: 'Migrate old blog URLs',
            hits: 0,
            lastHit: null,
            createdAt: Date.now() - 86400000 * 30,
          },
          {
            id: 'redirect-home',
            source: '/index.html',
            target: '/',
            type: 301,
            matchType: 'exact',
            enabled: true,
            priority: 100,
            description: 'Index page redirect',
            hits: 0,
            lastHit: null,
            createdAt: Date.now() - 86400000 * 60,
          },
        ];
        for (const rule of defaults) {
          await redirectRulesStore.set(rule.id, rule);
          redirectRulesCache.push(rule);
        }
      }

      const loadedLog = await redirectLogStore.getAll<RedirectLogEntry>();
      for (const v of Object.values(loadedLog)) if (v) redirectLogCache.push(v as RedirectLogEntry);

      const loadedNotFound = await notFoundStore.getAll<NotFoundEntry>();
      for (const [k, v] of Object.entries(loadedNotFound)) {
        if (v) notFoundCache.set(k, v as NotFoundEntry);
      }
    }

    context.hooks.addFilter('request:incoming', async (request: unknown) => {
      try {
        const req = request as {
          url?: string;
          ip?: string;
          headers?: Record<string, string>;
          method?: string;
        };
        const pathname = (req.url || '/').split('?')[0];
        const ip = req.ip || '0.0.0.0';
        const ua = req.headers?.['user-agent'] || '';
        const referrer = req.headers?.['referer'] || '';

        const sortedRules = [...redirectRulesCache]
          .filter((r) => r.enabled)
          .sort((a, b) => b.priority - a.priority);
        for (const rule of sortedRules) {
          if (matchPath(rule.source, pathname, rule.matchType)) {
            const target = applyRedirect(rule.source, rule.target, rule.matchType, pathname);
            rule.hits++;
            rule.lastHit = Date.now();
            await redirectRulesStore!.set(rule.id, rule);
            const logEntry: RedirectLogEntry = {
              id: generateId(),
              ruleId: rule.id,
              source: pathname,
              target,
              statusCode: rule.type,
              ip,
              userAgent: ua,
              referrer,
              timestamp: Date.now(),
            };
            redirectLogCache.push(logEntry);
            await redirectLogStore!.set(logEntry.id, logEntry);
            if (redirectLogCache.length > 5000) {
              const removed = redirectLogCache.splice(0, 500);
              await Promise.all(removed.map((e) => redirectLogStore!.delete(e.id)));
            }
            return { redirected: true, target, statusCode: rule.type };
          }
        }
        return request;
      } catch (err) {
        context.logger.warn(
          `Redirection: request:incoming error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return request;
      }
    });

    context.hooks.addAction('redirection:rule:create', async (data: unknown) => {
      try {
        const { source, target, type, matchType, description } = data as {
          source: string;
          target: string;
          type?: number;
          matchType?: string;
          description?: string;
        };
        if (!source || !target) {
          context.logger.warn('Redirection: Rule requires source and target');
          return;
        }
        const rule: RedirectRule = {
          id: generateId(),
          source,
          target,
          type: (type as 301 | 302 | 307 | 308) || 301,
          matchType: (matchType as 'exact' | 'prefix' | 'regex') || 'exact',
          enabled: true,
          priority: 50,
          description: description || '',
          hits: 0,
          lastHit: null,
          createdAt: Date.now(),
        };
        redirectRulesCache.push(rule);
        await redirectRulesStore!.set(rule.id, rule);
        context.logger.log(`Redirection: Rule created ${source} -> ${target} (${rule.type})`);
      } catch (err) {
        context.logger.warn(
          `Redirection: rule:create error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:rule:update', async (data: unknown) => {
      try {
        const { id, ...updates } = data as Partial<RedirectRule> & { id: string };
        const rule = redirectRulesCache.find((r) => r.id === id);
        if (!rule) {
          context.logger.warn(`Redirection: Rule ${id} not found`);
          return;
        }
        Object.assign(rule, updates);
        await redirectRulesStore!.set(rule.id, rule);
        context.logger.log(`Redirection: Rule ${id} updated`);
      } catch (err) {
        context.logger.warn(
          `Redirection: rule:update error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:rule:delete', async (data: unknown) => {
      try {
        const { id } = data as { id: string };
        const idx = redirectRulesCache.findIndex((r) => r.id === id);
        if (idx === -1) {
          context.logger.warn(`Redirection: Rule ${id} not found`);
          return;
        }
        redirectRulesCache.splice(idx, 1);
        await redirectRulesStore!.delete(id);
        context.logger.log(`Redirection: Rule ${id} deleted`);
      } catch (err) {
        context.logger.warn(
          `Redirection: rule:delete error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:404:track', async (data: unknown) => {
      try {
        const { path, ip, referrer } = data as { path: string; ip?: string; referrer?: string };
        if (!path) return;
        const existing = notFoundCache.get(path);
        if (existing) {
          existing.hits++;
          existing.lastSeen = Date.now();
          if (referrer && !existing.referrers.includes(referrer)) existing.referrers.push(referrer);
          await notFoundStore!.set(path, existing);
        } else {
          const entry: NotFoundEntry = {
            path,
            hits: 1,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            referrers: referrer ? [referrer] : [],
          };
          notFoundCache.set(path, entry);
          await notFoundStore!.set(path, entry);
        }
        context.logger.log(
          `Redirection: 404 tracked for ${path} (${notFoundCache.get(path)!.hits} total hits)`,
        );
      } catch (err) {
        context.logger.warn(
          `Redirection: 404:track error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:export', async () => {
      try {
        const csv = generateCsvExport(redirectRulesCache);
        context.logger.log(
          `Redirection: Exported ${redirectRulesCache.length} rules as CSV (${csv.length} chars)`,
        );
      } catch (err) {
        context.logger.warn(
          `Redirection: export error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:import', async (data: unknown) => {
      try {
        const { csv } = data as { csv: string };
        if (!csv) {
          context.logger.warn('Redirection: Import requires CSV content');
          return;
        }
        const imported = parseCsvImport(csv);
        for (const rule of imported) {
          const newRule: RedirectRule = {
            ...rule,
            id: generateId(),
            hits: 0,
            lastHit: null,
            createdAt: Date.now(),
          };
          redirectRulesCache.push(newRule);
          await redirectRulesStore!.set(newRule.id, newRule);
        }
        context.logger.log(`Redirection: Imported ${imported.length} rules from CSV`);
      } catch (err) {
        context.logger.warn(
          `Redirection: import error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('redirection:stats', async (data: unknown) => {
      try {
        const callback = (data as any)?.callback;
        const stats = {
          totalRules: redirectRulesCache.length,
          enabledRules: redirectRulesCache.filter((r) => r.enabled).length,
          totalHits: redirectRulesCache.reduce((a, r) => a + r.hits, 0),
          total404s: Array.from(notFoundCache.values()).reduce((a, e) => a + e.hits, 0),
          unique404Paths: notFoundCache.size,
          topRedirects: [...redirectRulesCache].sort((a, b) => b.hits - a.hits).slice(0, 5),
          top404s: Array.from(notFoundCache.values())
            .sort((a, b) => b.hits - a.hits)
            .slice(0, 5),
        };
        if (callback) callback(stats);
      } catch (err) {
        context.logger.warn(
          `Redirection: stats error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        const totalHits = redirectRulesCache.reduce((a, r) => a + r.hits, 0);
        const total404 = Array.from(notFoundCache.values()).reduce((a, e) => a + e.hits, 0);
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'Redirection Overview',
          priority: 7,
          content: `<div class="redirection-widget">
          <p>Active Rules: ${redirectRulesCache.filter((r) => r.enabled).length}/${redirectRulesCache.length}</p>
          <p>Total Redirect Hits: ${totalHits}</p>
          <p>404s Tracked: ${total404} (${notFoundCache.size} unique paths)</p>
          <p>Recent Log Entries: ${redirectLogCache.length}</p>
        </div>`,
        });
      } catch (err) {
        context.logger.warn(
          `Redirection: admin:dashboard:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      try {
        (data as any).sections = (data as any).sections || [];
        (data as any).sections.push({
          slug: 'redirection',
          title: 'Redirection',
          fields: [
            { name: 'logRetention', label: 'Log Retention (days)', type: 'number', value: 30 },
            { name: 'autoRedirect404', label: 'Auto-redirect 404s', type: 'boolean', value: false },
            { name: 'notifyOn404', label: 'Notify on 404', type: 'boolean', value: true },
          ],
        });
      } catch (err) {
        context.logger.warn(
          `Redirection: admin:settings:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.logger.log('Redirection plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Redirection plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Redirection plugin deactivated');
  },
};
