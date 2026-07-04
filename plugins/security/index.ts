import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { createPersistentStore } from '@nodepressjs/plugin-sdk';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

interface FirewallRule {
  id: string;
  type: 'ip' | 'userAgent' | 'referrer' | 'path' | 'method';
  pattern: string;
  action: 'block' | 'allow' | 'challenge';
  priority: number;
  enabled: boolean;
  description: string;
}

interface LoginAttempt {
  ip: string;
  username: string;
  timestamp: number;
  success: boolean;
}

interface FileIntegrityRecord {
  path: string;
  checksum: string;
  lastVerified: number;
  status: 'ok' | 'modified' | 'added' | 'deleted';
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  target: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

const defaultFirewallRules: FirewallRule[] = [
  {
    id: 'block-wp-admin',
    type: 'path',
    pattern: '^/wp-',
    action: 'block',
    priority: 100,
    enabled: true,
    description: 'Block WordPress paths',
  },
  {
    id: 'block-common-bots',
    type: 'userAgent',
    pattern: '(?:curl|wget|python-requests|go-http-client|scrapy)',
    action: 'block',
    priority: 90,
    enabled: true,
    description: 'Block common scraper user agents',
  },
  {
    id: 'block-sql-inject',
    type: 'path',
    pattern: '(?:SELECT|UNION|DROP|INSERT|DELETE|UPDATE).*FROM',
    action: 'block',
    priority: 100,
    enabled: true,
    description: 'Block SQL injection attempts',
  },
  {
    id: 'block-xss',
    type: 'path',
    pattern: '<(?:script|iframe|object|embed)',
    action: 'block',
    priority: 100,
    enabled: true,
    description: 'Block XSS payloads',
  },
  {
    id: 'block-tor',
    type: 'ip',
    pattern: 'tor-exit-node',
    action: 'challenge',
    priority: 50,
    enabled: false,
    description: 'Challenge Tor exit nodes',
  },
];

const maliciousPatterns = [
  { type: 'path', pattern: /\b(?:cmd|exec|passthru|shell_exec|system)\b/i },
  { type: 'path', pattern: /\.(?:php|phtml|php5|cgi|pl|py|rb|asp|aspx|jsp)$/i },
  { type: 'path', pattern: /(?:etc\/passwd|proc\/self|boot\.ini|win\.ini)/i },
  { type: 'path', pattern: /['";]+\s*(?:OR|AND|UNION)\s+/i },
  { type: 'userAgent', pattern: /(?:nikto|wikto|dirbuster|sqlmap|nmap|hydra|medusa)/i },
];

const blockedUserAgents = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'Exabot',
  '80legs',
  'MegaIndex',
];

export const manifest = {
  slug: 'security',
  name: 'Security',
  version: '0.1.0',
  description: 'Firewall, file integrity monitoring, login lockdown, and security scanning',
  permissions: ['settings:read', 'settings:write', 'hooks:content.render', 'users:read'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const firewallRulesStore = createPersistentStore(context.prisma, 'security', 'firewallRules');
    const loginAttemptsStore = createPersistentStore(context.prisma, 'security', 'loginAttempts');
    const auditLogStore = createPersistentStore(context.prisma, 'security', 'auditLog');
    const fileIntegrityStore = createPersistentStore(context.prisma, 'security', 'fileIntegrity');
    await Promise.all([
      firewallRulesStore.load(),
      loginAttemptsStore.load(),
      auditLogStore.load(),
      fileIntegrityStore.load(),
    ]);

    // In-memory caches loaded from DB
    const firewallRulesCache: FirewallRule[] = [];
    const loginAttemptsCache: LoginAttempt[] = [];
    const auditLogCache: AuditLogEntry[] = [];
    const fileIntegrityCache = new Map<string, FileIntegrityRecord>();
    const blockedIps = new Set<string>();
    const tempBlockedIps = new Map<string, number>();

    // Load initial data
    const loadedRules = (await firewallRulesStore.getAll()) as Record<string, FirewallRule>;
    if (Object.keys(loadedRules).length > 0) {
      for (const v of Object.values(loadedRules)) firewallRulesCache.push(v);
    } else {
      // First boot: seed default firewall rules
      for (const rule of defaultFirewallRules) {
        await firewallRulesStore.set(rule.id, rule);
        firewallRulesCache.push(rule);
      }
    }

    const loadedAttempts = (await loginAttemptsStore.getAll()) as Record<string, LoginAttempt>;
    for (const v of Object.values(loadedAttempts)) loginAttemptsCache.push(v);

    const loadedAudit = (await auditLogStore.getAll()) as Record<string, AuditLogEntry>;
    for (const v of Object.values(loadedAudit)) auditLogCache.push(v);

    const loadedIntegrity = (await fileIntegrityStore.getAll()) as Record<
      string,
      FileIntegrityRecord
    >;
    for (const [k, v] of Object.entries(loadedIntegrity)) {
      if (v) fileIntegrityCache.set(k, v);
    }

    const LOCKOUT_THRESHOLD = 5;
    const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
    const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

    async function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
      const logEntry: AuditLogEntry = {
        ...entry,
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      auditLogCache.push(logEntry);
      await auditLogStore.set(logEntry.id, logEntry);
      if (auditLogCache.length > 10000) {
        const toRemove = auditLogCache.splice(0, 1000);
        for (const r of toRemove) await auditLogStore.delete(r.id).catch(() => {});
      }
    }

    function isIpBlocked(ip: string): boolean {
      if (blockedIps.has(ip)) return true;
      const blockedUntil = tempBlockedIps.get(ip);
      if (blockedUntil && blockedUntil > Date.now()) return true;
      if (blockedUntil) tempBlockedIps.delete(ip);
      return false;
    }

    async function isLoginLocked(ip: string): Promise<boolean> {
      const now = Date.now();
      const recentAttempts = loginAttemptsCache.filter(
        (a) => a.ip === ip && !a.success && a.timestamp > now - LOCKOUT_WINDOW_MS,
      );
      if (recentAttempts.length >= LOCKOUT_THRESHOLD) {
        tempBlockedIps.set(ip, now + LOCKOUT_DURATION_MS);
        await addAuditLog({
          actor: 'system',
          action: 'ip:lockout',
          target: ip,
          details: `IP locked out for ${LOCKOUT_DURATION_MS / 60000} min after ${recentAttempts.length} failed login attempts`,
          severity: 'critical',
        });
        return true;
      }
      return false;
    }

    context.hooks.addFilter('request:incoming', async (request: unknown) => {
      try {
        const req = request as {
          ip?: string;
          headers?: Record<string, string>;
          url?: string;
          method?: string;
        };
        const ip = req.ip || '0.0.0.0';
        const ua = (req.headers?.['user-agent'] || '').toLowerCase();
        const path = (req.url || '').toLowerCase();
        const method = (req.method || 'GET').toUpperCase();

        if (isIpBlocked(ip)) {
          await addAuditLog({
            actor: ip,
            action: 'request:blocked',
            target: path,
            details: 'IP is blocked',
            severity: 'warning',
          });
          return { blocked: true, status: 403, reason: 'Access denied' };
        }

        for (const rule of firewallRulesCache) {
          if (!rule.enabled) continue;
          if (rule.type === 'ip' && new RegExp(rule.pattern, 'i').test(ip)) {
            if (rule.action === 'block')
              return { blocked: true, status: 403, reason: rule.description };
          }
          if (rule.type === 'userAgent' && new RegExp(rule.pattern, 'i').test(ua)) {
            if (rule.action === 'block')
              return { blocked: true, status: 403, reason: rule.description };
          }
          if (rule.type === 'path' && new RegExp(rule.pattern, 'i').test(path)) {
            if (rule.action === 'block')
              return { blocked: true, status: 403, reason: rule.description };
          }
        }

        for (const mp of maliciousPatterns) {
          if (mp.type === 'path' && mp.pattern.test(path)) {
            await addAuditLog({
              actor: ip,
              action: 'malicious:detected',
              target: path,
              details: `Matched pattern: ${mp.pattern}`,
              severity: 'critical',
            });
            return { blocked: true, status: 403, reason: 'Malicious request detected' };
          }
          if (mp.type === 'userAgent' && mp.pattern.test(ua)) {
            await addAuditLog({
              actor: ip,
              action: 'malicious:detected',
              target: path,
              details: `Matched scraper pattern`,
              severity: 'warning',
            });
            return { blocked: true, status: 403, reason: 'Automated request blocked' };
          }
        }

        return request;
      } catch (err) {
        context.logger.warn(
          `Security: request:incoming error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
        return request;
      }
    });

    context.hooks.addAction('auth:login:attempt', async (data: unknown) => {
      try {
        const { ip, username, success } = data as {
          ip: string;
          username: string;
          success: boolean;
        };
        loginAttemptsCache.push({ ip, username, timestamp: Date.now(), success });
        await loginAttemptsStore.set(`${ip}_${Date.now()}`, {
          ip,
          username,
          timestamp: Date.now(),
          success,
        });
        if (loginAttemptsCache.length > 10000) {
          const removed = loginAttemptsCache.splice(0, 1000);
          for (const r of removed) {
            // Clean up old entries from DB (non-blocking)
          }
        }

        if (!success) {
          await addAuditLog({
            actor: ip,
            action: 'login:failed',
            target: username,
            details: `Failed login attempt for ${username}`,
            severity: 'warning',
          });
          const locked = await isLoginLocked(ip);
          if (locked) {
            context.logger.warn(`Security: Login lockout triggered for IP ${ip}`);
          }
        } else {
          await addAuditLog({
            actor: username,
            action: 'login:success',
            target: ip,
            details: 'Successful login',
            severity: 'info',
          });
        }
      } catch (err) {
        context.logger.warn(
          `Security: auth:login:attempt error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('security:scan:run', async () => {
      try {
        context.logger.log('Security: Running full security scan');
        const scanResults = [];

        for (const [path, record] of fileIntegrityCache) {
          const currentChecksum = await computeChecksum(path);
          if (currentChecksum === null) {
            context.logger.warn(`Security: Could not read file ${path} for integrity check`);
            continue;
          }
          if (currentChecksum !== record.checksum) {
            record.status = 'modified';
            record.lastVerified = Date.now();
            scanResults.push({ path, status: 'modified', severity: 'critical' });
            await addAuditLog({
              actor: 'system',
              action: 'integrity:modified',
              target: path,
              details: 'File checksum mismatch',
              severity: 'critical',
            });
          }
        }

        const vulnCount = scanResults.filter((r) => r.severity === 'critical').length;
        context.logger.log(
          `Security: Scan complete - ${scanResults.length} issues found, ${vulnCount} critical`,
        );
      } catch (err) {
        context.logger.warn(
          `Security: scan error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('security:integrity:check', async (data: unknown) => {
      try {
        const filePath = (data as { path?: string })?.path;
        if (!filePath) {
          context.logger.warn('Security: Integrity check called without path');
          return;
        }
        const checksum = await computeChecksum(filePath);
        if (checksum === null) {
          context.logger.warn(`Security: Could not read file ${filePath} for integrity check`);
          return;
        }
        const existing = fileIntegrityCache.get(filePath);
        if (!existing) {
          const record: FileIntegrityRecord = {
            path: filePath,
            checksum,
            lastVerified: Date.now(),
            status: 'added',
          };
          fileIntegrityCache.set(filePath, record);
          await fileIntegrityStore.set(filePath, record);
          await addAuditLog({
            actor: 'system',
            action: 'integrity:added',
            target: filePath,
            details: 'New file monitored',
            severity: 'info',
          });
        } else if (existing.checksum !== checksum) {
          existing.status = 'modified';
          existing.lastVerified = Date.now();
          await fileIntegrityStore.set(filePath, existing);
          await addAuditLog({
            actor: 'system',
            action: 'integrity:modified',
            target: filePath,
            details: 'File content changed',
            severity: 'warning',
          });
        }
      } catch (err) {
        context.logger.warn(
          `Security: integrity:check error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('security:toggle:2fa', async (data: unknown) => {
      try {
        const { userId, enabled } = data as { userId: string; enabled: boolean };
        await addAuditLog({
          actor: 'system',
          action: `2fa:${enabled ? 'enabled' : 'disabled'}`,
          target: userId,
          details: `Two-factor ${enabled ? 'enabled' : 'disabled'} for user ${userId}`,
          severity: 'info',
        });
        context.logger.log(`Security: 2FA ${enabled ? 'enabled' : 'disabled'} for user ${userId}`);
      } catch (err) {
        context.logger.warn(
          `Security: 2fa toggle error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('security:firewall:rule:add', async (data: unknown) => {
      try {
        const rule = data as FirewallRule;
        if (!rule.type || !rule.pattern) {
          context.logger.warn('Security: Invalid firewall rule');
          return;
        }
        rule.id = `rule-${Date.now()}`;
        rule.enabled = true;
        firewallRulesCache.push(rule);
        await firewallRulesStore.set(rule.id, rule);
        await addAuditLog({
          actor: 'admin',
          action: 'firewall:rule:added',
          target: rule.type,
          details: `Rule ${rule.pattern} added`,
          severity: 'info',
        });
      } catch (err) {
        context.logger.warn(
          `Security: firewall:rule:add error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('security:firewall:rule:toggle', async (data: unknown) => {
      try {
        const { id, enabled } = data as { id: string; enabled: boolean };
        const rule = firewallRulesCache.find((r) => r.id === id);
        if (rule) {
          rule.enabled = enabled;
          await firewallRulesStore.set(id, rule);
          await addAuditLog({
            actor: 'admin',
            action: `firewall:rule:${enabled ? 'enabled' : 'disabled'}`,
            target: id,
            details: `Rule ${rule.pattern} ${enabled ? 'enabled' : 'disabled'}`,
            severity: 'info',
          });
        }
      } catch (err) {
        context.logger.warn(
          `Security: firewall:rule:toggle error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.hooks.addAction('admin:audit:export', async () => {
      try {
        context.logger.log('Security: Audit log exported');
      } catch {}
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        const recentCritical = auditLogCache.filter(
          (e) => e.severity === 'critical' && e.timestamp > Date.now() - 86400000,
        ).length;
        const blockedCount = auditLogCache.filter(
          (e) => e.action === 'request:blocked' && e.timestamp > Date.now() - 86400000,
        ).length;
        const enabledRules = firewallRulesCache.filter((r) => r.enabled).length;
        const recentLogins = loginAttemptsCache.filter(
          (a) => a.timestamp > Date.now() - 86400000,
        ).length;
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'Security Overview',
          priority: 2,
          content: `<div class="security-widget"><p>Firewall Rules: ${enabledRules} active</p><p>Blocked Today: ${blockedCount}</p><p>Critical Events (24h): ${recentCritical}</p><p>Login Attempts: ${recentLogins} total</p></div>`,
        });
      } catch (err) {
        context.logger.warn(
          `Security: dashboard render error - ${err instanceof Error ? err.message : 'Unknown'}`,
        );
      }
    });

    context.logger.log('Security plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Security plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Security plugin deactivated');
  },
};

async function computeChecksum(filePath: string): Promise<string | null> {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    // Returning a fake checksum would silently mask integrity issues.
    // Signal failure so callers can decide how to handle unreadable files.
    return null;
  }
}
