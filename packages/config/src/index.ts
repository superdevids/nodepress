/**
 * @nodepress/config
 *
 * Shared configuration utilities for NodePress.
 * Provides schema-validated config objects for CORS, security, and general settings.
 */

export { corsConfig, type CorsConfig } from './cors.js';
export { securityConfig, type SecurityConfig } from './security.js';
export { nodepressPreset } from './tailwind-preset.js';

export interface AppConfig {
  port: number;
  url: string;
  env: 'development' | 'production' | 'test';
  debug: boolean;
}

/**
 * Get the application configuration from environment variables.
 */
export function getAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    url: process.env.APP_URL ?? 'http://localhost:3000',
    env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
    debug: process.env.NODEPRESS_DEBUG === 'true',
  };
}
