/**
 * Security configuration (Gap F-01, F-08, F-09)
 */

/**
 * Security configuration for NodePress.
 * Includes CSP headers, rate limiting defaults, and password policy.
 */
export interface SecurityConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: number;
    refreshExpiresIn: number;
    issuer: string;
  };
  rateLimit: {
    ttl: number;
    max: number;
    loginMax: number;
  };
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: Record<string, string[]>;
  };
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSymbols: boolean;
    requireUppercase: boolean;
    historySize: number;
    expiryDays: number;
  };
  encryption: {
    key: string;
  };
}

/**
 * Get security configuration from environment variables.
 */
export function securityConfig(): SecurityConfig {
  const jwtSecret = process.env.JWT_SECRET ?? '';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? '';

  if (!jwtSecret) {
    throw new Error(
      'CONFIG_MISSING: JWT_SECRET environment variable is not set. Application cannot start securely.',
    );
  }
  if (!jwtRefreshSecret) {
    throw new Error(
      'CONFIG_MISSING: JWT_REFRESH_SECRET environment variable is not set. Application cannot start securely.',
    );
  }

  const encryptionKey = process.env.ENCRYPTION_KEY ?? '';
  if (!encryptionKey) {
    throw new Error(
      'CONFIG_MISSING: ENCRYPTION_KEY environment variable is not set. Application cannot start securely.',
    );
  }
  if (/^0{32}$/.test(encryptionKey)) {
    throw new Error(
      'CONFIG_MISSING: ENCRYPTION_KEY must not be the default placeholder value. Generate a unique key with: openssl rand -hex 32',
    );
  }

  return {
    jwt: {
      secret: jwtSecret,
      refreshSecret: jwtRefreshSecret,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN ?? '900', 10), // 15 minutes
      refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10), // 7 days
      issuer: process.env.JWT_ISSUER ?? 'nodepress',
    },
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
      loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? '10', 10),
    },
    csp: {
      enabled: process.env.CSP_ENABLED !== 'false',
      reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'", 'https:', 'wss:'],
        'frame-src': ["'self'", 'https://www.youtube.com'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
      },
    },
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH ?? '8', 10),
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false',
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      historySize: parseInt(process.env.PASSWORD_HISTORY_SIZE ?? '5', 10),
      expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS ?? '90', 10),
    },
    encryption: {
      key: encryptionKey, // 32 hex chars — validated above
    },
  };
}
