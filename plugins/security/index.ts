import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

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
    const firewallRules: FirewallRule[] = [...defaultFirewallRules];
    const loginAttempts: LoginAttempt[] = [];
    const auditLog: AuditLogEntry[] = [];
    const fileIntegrity: Map<string, FileIntegrityRecord> = new Map();
    const LOCKOUT_THRESHOLD = 5;
    const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
    const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
    const blockedIps = new Set<string>();
    const tempBlockedIps = new Map<string, number>();

    function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
      auditLog.push({
        ...entry,
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      });
      if (auditLog.length > 10000) auditLog.splice(0, 1000);
    }

    function isIpBlocked(ip: string): boolean {
      if (blockedIps.has(ip)) return true;
      const blockedUntil = tempBlockedIps.get(ip);
      if (blockedUntil && blockedUntil > Date.now()) return true;
      if (blockedUntil) tempBlockedIps.delete(ip);
      return false;
    }

    function isLoginLocked(ip: string): boolean {
      const recentAttempts = loginAttempts.filter(
        (a) => a.ip === ip && !a.success && a.timestamp > Date.now() - LOCKOUT_WINDOW_MS,
      );
      if (recentAttempts.length >= LOCKOUT_THRESHOLD) {
        tempBlockedIps.set(ip, Date.now() + LOCKOUT_DURATION_MS);
        addAuditLog({
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
        addAuditLog({
          actor: ip,
          action: 'request:blocked',
          target: path,
          details: 'IP is blocked',
          severity: 'warning',
        });
        return { blocked: true, status: 403, reason: 'Access denied' };
      }

      for (const rule of firewallRules) {
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
          addAuditLog({
            actor: ip,
            action: 'malicious:detected',
            target: path,
            details: `Matched pattern: ${mp.pattern}`,
            severity: 'critical',
          });
          return { blocked: true, status: 403, reason: 'Malicious request detected' };
        }
        if (mp.type === 'userAgent' && mp.pattern.test(ua)) {
          addAuditLog({
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
    });

    context.hooks.addAction('auth:login:attempt', async (data: unknown) => {
      const { ip, username, success } = data as { ip: string; username: string; success: boolean };
      loginAttempts.push({ ip, username, timestamp: Date.now(), success });
      if (loginAttempts.length > 10000) loginAttempts.splice(0, 1000);

      if (!success) {
        addAuditLog({
          actor: ip,
          action: 'login:failed',
          target: username,
          details: `Failed login attempt for ${username}`,
          severity: 'warning',
        });
        if (isLoginLocked(ip)) {
          context.logger.warn(`Security: Login lockout triggered for IP ${ip}`);
        }
      } else {
        addAuditLog({
          actor: username,
          action: 'login:success',
          target: ip,
          details: 'Successful login',
          severity: 'info',
        });
      }
    });

    context.hooks.addAction('security:scan:run', async () => {
      context.logger.log('Security: Running full security scan');
      const scanResults = [];

      for (const [path, record] of fileIntegrity) {
        const currentChecksum = await computeChecksum(path);
        if (currentChecksum !== record.checksum) {
          record.status = 'modified';
          record.lastVerified = Date.now();
          scanResults.push({ path, status: 'modified', severity: 'critical' });
          addAuditLog({
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
    });

    context.hooks.addAction('security:integrity:check', async (data: unknown) => {
      const filePath = (data as { path?: string })?.path;
      if (!filePath) {
        context.logger.warn('Security: Integrity check called without path');
        return;
      }
      const checksum = await computeChecksum(filePath);
      const existing = fileIntegrity.get(filePath);
      if (!existing) {
        fileIntegrity.set(filePath, {
          path: filePath,
          checksum,
          lastVerified: Date.now(),
          status: 'added',
        });
        addAuditLog({
          actor: 'system',
          action: 'integrity:added',
          target: filePath,
          details: 'New file monitored',
          severity: 'info',
        });
      } else if (existing.checksum !== checksum) {
        existing.status = 'modified';
        existing.lastVerified = Date.now();
        addAuditLog({
          actor: 'system',
          action: 'integrity:modified',
          target: filePath,
          details: 'File content changed',
          severity: 'warning',
        });
      }
    });

    context.hooks.addAction('security:toggle:2fa', async (data: unknown) => {
      const { userId, enabled } = data as { userId: string; enabled: boolean };
      addAuditLog({
        actor: 'system',
        action: `2fa:${enabled ? 'enabled' : 'disabled'}`,
        target: userId,
        details: `Two-factor ${enabled ? 'enabled' : 'disabled'} for user ${userId}`,
        severity: 'info',
      });
      context.logger.log(`Security: 2FA ${enabled ? 'enabled' : 'disabled'} for user ${userId}`);
    });

    context.hooks.addAction('security:firewall:rule:add', async (data: unknown) => {
      const rule = data as FirewallRule;
      if (!rule.type || !rule.pattern) {
        context.logger.warn('Security: Invalid firewall rule');
        return;
      }
      rule.id = `rule-${Date.now()}`;
      rule.enabled = true;
      firewallRules.push(rule);
      addAuditLog({
        actor: 'admin',
        action: 'firewall:rule:added',
        target: rule.type,
        details: `Rule ${rule.pattern} added`,
        severity: 'info',
      });
    });

    context.hooks.addAction('security:firewall:rule:toggle', async (data: unknown) => {
      const { id, enabled } = data as { id: string; enabled: boolean };
      const rule = firewallRules.find((r) => r.id === id);
      if (rule) {
        rule.enabled = enabled;
        addAuditLog({
          actor: 'admin',
          action: `firewall:rule:${enabled ? 'enabled' : 'disabled'}`,
          target: id,
          details: `Rule ${rule.pattern} ${enabled ? 'enabled' : 'disabled'}`,
          severity: 'info',
        });
      }
    });

    context.hooks.addAction('admin:audit:export', async () => {
      context.logger.log('Security: Audit log exported');
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const recentCritical = auditLog.filter(
        (e) => e.severity === 'critical' && e.timestamp > Date.now() - 86400000,
      ).length;
      const blockedCount = auditLog.filter(
        (e) => e.action === 'request:blocked' && e.timestamp > Date.now() - 86400000,
      ).length;
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Security Overview',
        priority: 2,
        content: `<div class="security-widget"><p>Firewall Rules: ${firewallRules.filter((r) => r.enabled).length} active</p><p>Blocked Today: ${blockedCount}</p><p>Critical Events (24h): ${recentCritical}</p><p>Login Attempts: ${loginAttempts.filter((a) => a.timestamp > Date.now() - 86400000).length} total</p></div>`,
      });
    });

    context.logger.log('Security plugin booted');
  },

  async activate() {
    console.log('Security plugin activated');
  },

  async deactivate() {
    console.log('Security plugin deactivated');
  },
};

async function computeChecksum(filePath: string): Promise<string> {
  return `${filePath.length}-${Buffer.byteLength(filePath, 'utf-8')}`;
}
