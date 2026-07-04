/**
 * NodePress Admin Constants
 *
 * Central location for all constant values used across the admin panel.
 * Extract hardcoded strings here to keep them maintainable and consistent.
 */

// ─── localStorage keys ─────────────────────────────────────

export const STORAGE_KEYS = {
  /** Auth token */
  AUTH_TOKEN: 'np_token',
  /** Auth refresh token */
  AUTH_REFRESH_TOKEN: 'np_refresh_token',
  /** Screen options: items per page */
  SCREEN_PER_PAGE: 'nodepress_screen_per_page',
  /** Screen options: visible columns */
  SCREEN_COLUMNS: 'nodepress_screen_columns',
  /** Screen options: plugin options */
  SCREEN_PLUGIN_OPTIONS: 'nodepress_screen_plugin_options',
} as const;

// ─── App version ───────────────────────────────────────────

/** Current version of the admin panel — sourced from package.json */
export const APP_VERSION = '0.0.1';

// ─── API paths ─────────────────────────────────────────────

export const API_PATHS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_READING: '/settings/reading',
  SETTINGS_CORS: '/settings/cors',
  SETTINGS_PERMALINK: '/settings/permalink',
  SETTINGS_SECURITY: '/settings/security',
  SETTINGS_SEO: '/settings/seo',
  USERS: '/users',
  UPDATES: '/updates',
  UPDATES_UPDATE_ALL: '/updates/update-all',
  UPDATES_UPDATE_ITEM: '/updates/update-item',
} as const;
