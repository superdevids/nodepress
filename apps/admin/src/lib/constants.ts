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
  /** Color scheme preference */
  COLOR_SCHEME: 'nodepress_color_scheme',
  /** Dashboard widget order */
  DASHBOARD_WIDGET_ORDER: 'nodepress_dashboard_widget_order',
  /** Dashboard widget visibility */
  DASHBOARD_WIDGET_VISIBILITY: 'nodepress_dashboard_widget_visibility',
  /** Content list view mode (list/grid) */
  CONTENT_VIEW_MODE: 'nodepress_content_view_mode',
  /** Media library view mode */
  MEDIA_VIEW_MODE: 'nodepress_media_view_mode',
  /** Sidebar collapsed state */
  SIDEBAR_COLLAPSED: 'nodepress_sidebar_collapsed',
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
  CONTENT_POSTS: '/content/posts',
  CONTENT_PAGES: '/content/pages',
  MEDIA: '/media',
  NOTIFICATIONS: '/notifications',
  CATEGORIES: '/categories',
  TAGS: '/tags',
} as const;

// ─── User Roles ────────────────────────────────────────────

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  CONTRIBUTOR: 'contributor',
  SUBSCRIBER: 'subscriber',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  author: 'Author',
  contributor: 'Contributor',
  subscriber: 'Subscriber',
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  admin: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  editor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  author: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  contributor: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  subscriber: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
};

// ─── Content Status ────────────────────────────────────────

export const CONTENT_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  PENDING: 'pending',
  TRASHED: 'trashed',
  PRIVATE: 'private',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  draft: 'Draft',
  pending: 'Pending Review',
  trashed: 'Trashed',
  private: 'Private',
};

export const STATUS_COLORS: Record<string, string> = {
  published: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  trashed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  private: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─── Color Schemes ─────────────────────────────────────────

export const DEFAULT_COLOR_SCHEME = 'default';
