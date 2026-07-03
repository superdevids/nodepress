import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';

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

const redirectRules: RedirectRule[] = [
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

const redirectLog: RedirectLogEntry[] = [];
const notFoundTracker: Map<string, NotFoundEntry> = new Map();

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
    context.hooks.addFilter('request:incoming', async (request: unknown) => {
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

      const sortedRules = [...redirectRules]
        .filter((r) => r.enabled)
        .sort((a, b) => b.priority - a.priority);
      for (const rule of sortedRules) {
        if (matchPath(rule.source, pathname, rule.matchType)) {
          const target = applyRedirect(rule.source, rule.target, rule.matchType, pathname);
          rule.hits++;
          rule.lastHit = Date.now();
          redirectLog.push({
            id: generateId(),
            ruleId: rule.id,
            source: pathname,
            target,
            statusCode: rule.type,
            ip,
            userAgent: ua,
            referrer,
            timestamp: Date.now(),
          });
          if (redirectLog.length > 5000) redirectLog.splice(0, 500);
          return { redirected: true, target, statusCode: rule.type };
        }
      }
      return request;
    });

    context.hooks.addAction('redirection:rule:create', async (data: unknown) => {
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
      redirectRules.push(rule);
      context.logger.log(`Redirection: Rule created ${source} -> ${target} (${rule.type})`);
    });

    context.hooks.addAction('redirection:rule:update', async (data: unknown) => {
      const { id, ...updates } = data as Partial<RedirectRule> & { id: string };
      const rule = redirectRules.find((r) => r.id === id);
      if (!rule) {
        context.logger.warn(`Redirection: Rule ${id} not found`);
        return;
      }
      Object.assign(rule, updates);
      context.logger.log(`Redirection: Rule ${id} updated`);
    });

    context.hooks.addAction('redirection:rule:delete', async (data: unknown) => {
      const { id } = data as { id: string };
      const idx = redirectRules.findIndex((r) => r.id === id);
      if (idx === -1) {
        context.logger.warn(`Redirection: Rule ${id} not found`);
        return;
      }
      redirectRules.splice(idx, 1);
      context.logger.log(`Redirection: Rule ${id} deleted`);
    });

    context.hooks.addAction('redirection:404:track', async (data: unknown) => {
      const { path, ip, referrer } = data as { path: string; ip?: string; referrer?: string };
      if (!path) return;
      const existing = notFoundTracker.get(path);
      if (existing) {
        existing.hits++;
        existing.lastSeen = Date.now();
        if (referrer && !existing.referrers.includes(referrer)) existing.referrers.push(referrer);
      } else {
        notFoundTracker.set(path, {
          path,
          hits: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          referrers: referrer ? [referrer] : [],
        });
      }
      context.logger.log(
        `Redirection: 404 tracked for ${path} (${notFoundTracker.get(path)!.hits} total hits)`,
      );
    });

    context.hooks.addAction('redirection:export', async () => {
      const csv = generateCsvExport(redirectRules);
      context.logger.log(
        `Redirection: Exported ${redirectRules.length} rules as CSV (${csv.length} chars)`,
      );
    });

    context.hooks.addAction('redirection:import', async (data: unknown) => {
      const { csv } = data as { csv: string };
      if (!csv) {
        context.logger.warn('Redirection: Import requires CSV content');
        return;
      }
      const imported = parseCsvImport(csv);
      for (const rule of imported) {
        redirectRules.push({
          ...rule,
          id: generateId(),
          hits: 0,
          lastHit: null,
          createdAt: Date.now(),
        });
      }
      context.logger.log(`Redirection: Imported ${imported.length} rules from CSV`);
    });

    context.hooks.addAction('redirection:stats', async (data: unknown) => {
      const callback = (data as any)?.callback;
      const stats = {
        totalRules: redirectRules.length,
        enabledRules: redirectRules.filter((r) => r.enabled).length,
        totalHits: redirectRules.reduce((a, r) => a + r.hits, 0),
        total404s: Array.from(notFoundTracker.values()).reduce((a, e) => a + e.hits, 0),
        unique404Paths: notFoundTracker.size,
        topRedirects: [...redirectRules].sort((a, b) => b.hits - a.hits).slice(0, 5),
        top404s: Array.from(notFoundTracker.values())
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 5),
      };
      if (callback) callback(stats);
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const totalHits = redirectRules.reduce((a, r) => a + r.hits, 0);
      const total404 = Array.from(notFoundTracker.values()).reduce((a, e) => a + e.hits, 0);
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Redirection Overview',
        priority: 7,
        content: `<div class="redirection-widget">
          <p>Active Rules: ${redirectRules.filter((r) => r.enabled).length}/${redirectRules.length}</p>
          <p>Total Redirect Hits: ${totalHits}</p>
          <p>404s Tracked: ${total404} (${notFoundTracker.size} unique paths)</p>
          <p>Recent Log Entries: ${redirectLog.length}</p>
        </div>`,
      });
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
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
    });

    context.logger.log('Redirection plugin booted');
  },

  async activate() {
    console.log('Redirection plugin activated');
  },

  async deactivate() {
    console.log('Redirection plugin deactivated');
  },
};
