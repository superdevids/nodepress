/**
 * @nodepressjs/core - NodePress Business Logic Engine
 *
 * Central orchestrator for all CMS operations:
 * - Content modeling & management
 * - Plugin system (hooks, lifecycle, sandboxing)
 * - Theme engine (templates, customizer, widgets)
 * - Authentication & authorization (RBAC)
 * - Security (encryption, 2FA, password policy)
 * - Media & file handling
 * - SEO, shortcodes, oEmbed
 * - Mail, backup, logging, i18n, cron, scheduler
 */

// ─── Content Engine ─────────────────────────────────────
export { ContentEngine, defineContentType, field } from './content/content-engine.js';
export type {
  ContentTypeDefinition,
  FieldDefinition,
  FieldType,
} from './content/content-engine.js';

export {
  PostFormats,
  PostFormat,
  POST_FORMATS,
  POST_FORMAT_LABELS,
  isPostFormat,
} from './content/post-formats.js';
export type { PostFormatValidation } from './content/post-formats.js';

export { StickyPosts } from './content/sticky-posts.js';
export type { StickyPostEntry } from './content/sticky-posts.js';

export { PasswordContent } from './content/password-content.js';
export type { PasswordContentEntry, UnlockResult } from './content/password-content.js';

export { FeaturedImage } from './content/featured-image.js';
export type { FeaturedImageData, ThumbnailSize } from './content/featured-image.js';

export { PageTemplateRegistry, PageTemplateResolver } from './content/page-templates.js';
export type { PageTemplate, PageTemplateData } from './content/page-templates.js';

// ─── Plugin System ──────────────────────────────────────
export { PluginEngine } from './plugin/plugin-engine.js';
export type { PluginManifest, PluginLifecycle, PluginBootContext } from './plugin/plugin-engine.js';

export { HookRegistry } from './plugin/hook-registry.js';
export type { HookEvent } from './plugin/hook-registry.js';
export { DependencyResolver } from './plugin/dependency-resolver.js';
export { SandboxManager } from './plugin/sandbox-manager.js';
export { SettingsApi } from './plugin/settings-api.js';
export { CronApi } from './plugin/cron-api.js';
export { AssetRegistry } from './plugin/asset-registry.js';
export { AutoUpdater } from './plugin/auto-updater.js';
export { CapabilityRegistrar } from './plugin/capability-registrar.js';
export { DbMigrationManager } from './plugin/db-migration.js';
export { MuPluginLoader } from './plugin/mu-plugin-loader.js';
export { RollbackManager } from './plugin/rollback-manager.js';
export { UninstallManager } from './plugin/uninstall-manager.js';
export { ActivationHookManager } from './plugin/activation-hooks.js';
export { RegistryClient } from './plugin/registry-client.js';
export { PluginI18n } from './plugin/plugin-i18n.js';
export { FileEditor } from './plugin/file-editor.js';

// ─── Theme Engine ───────────────────────────────────────
export { ThemeEngine } from './theme/theme-engine.js';
export type { ThemeManifest, TemplateHierarchy } from './theme/theme-engine.js';

export { ChildThemeResolver } from './theme/child-theme-resolver.js';
export type { ChildThemeManifest, ResolvedTemplatePath } from './theme/child-theme-resolver.js';

export { ThemeJsonParser } from './theme/theme-json-parser.js';
export type {
  ThemeJson,
  ThemeJsonSettings,
  ThemeJsonStyles,
  ThemeJsonColorPalette,
  ThemeJsonGradient,
  ThemeJsonFontSize,
  ThemeJsonFontFamily,
  ThemeJsonTypographySettings,
  ThemeJsonColorSettings,
  ThemeJsonSpacingSettings,
  ThemeJsonLayoutSettings,
  ThemeJsonBlockStyles,
  ThemeJsonCustomTemplate,
  ThemeJsonStyleVariation,
  CssCustomProperty,
} from './theme/theme-json-parser.js';

export { TemplatePartsManager } from './theme/template-parts.js';
export type { TemplatePartDefinition, TemplatePartRecord } from './theme/template-parts.js';

export {
  BlockPatternsManager,
  type BlockPatternDefinition,
  type BlockPatternRecord,
  type BlockPatternCategory,
  type BlockPatternCategoryDef,
} from './theme/block-patterns.js';

export { BlockAreasManager, BlockAreaRenderer } from './theme/block-areas.js';
export type { BlockAreaDefinition, BlockAreaRecord } from './theme/block-areas.js';

export { ThemeSetupManager } from './theme/theme-setup.js';
export type {
  ThemeSetupContext,
  ThemeSetupFn,
  ThemeSetupConfig,
  ThemeSetupImageSize,
} from './theme/theme-setup.js';

export { ThemeSupportsManager, ThemeFeature } from './theme/theme-supports.js';
export type { ThemeFeatureEffect } from './theme/theme-supports.js';

export { NavMenuLocationsManager } from './theme/nav-menu-locations.js';
export type {
  NavMenuLocationDef,
  NavMenuLocationRecord,
  NavMenuTreeItem,
  NavMenuTree,
} from './theme/nav-menu-locations.js';

export { WidgetAreaManager, widgetAreaManager } from './theme/widget-areas.js';
export type { WidgetArea, WidgetBlock } from './theme/widget-areas.js';

export {
  ThemeCustomizerPanel as PanelThemeCustomizer,
  registerDefaultCustomizerPanels,
  themeCustomizer,
} from './theme/theme-customizer-panel.js';
export type {
  CustomizerPanel,
  CustomizerSection,
  CustomizerControl,
} from './theme/theme-customizer-panel.js';

export { ThemeBrandingManager } from './theme/theme-branding.js';
export type { ThemeBrandingSettings, ThemeModValue, ThemeModKey } from './theme/theme-branding.js';

export { ThemeAutoUpdater } from './theme/theme-auto-updater.js';
export type {
  ThemeAutoUpdateConfig,
  ThemeUpdateInfo,
  ThemeUpdateResult,
  AutoUpdateMode,
} from './theme/theme-auto-updater.js';

export { ThemePreviewManager } from './theme/theme-preview.js';
export type { ThemePreviewState } from './theme/theme-preview.js';

export { StyleVariationsManager } from './theme/style-variations.js';
export type { StyleVariationDef, StyleVariationRecord } from './theme/style-variations.js';

export { TemplateHierarchyResolver } from './theme/template-hierarchy.js';
export type {
  TemplateType,
  TemplateResolutionContext,
  ResolvedTemplate,
} from './theme/template-hierarchy.js';

// ─── Authentication & Authorization ─────────────────────
export { AuthService } from './auth/auth-service.js';
export type { AuthTokens, LoginInput, RegisterInput } from './auth/auth-service.js';

export { CapabilityService } from './auth/capability-service.js';
export type { Capability, RoleDefinition } from './auth/capability-service.js';

// ─── Security ───────────────────────────────────────────
export { SecurityService } from './security/security-service.js';
export type { SecurityKeys } from './security/security-service.js';
export { RecoveryMode } from './security/recovery-mode.js';
export type { PluginErrorRecord } from './security/recovery-mode.js';
export { ApplicationPasswordsEngine } from './security/application-passwords.js';
export type { AppPasswordData } from './security/application-passwords.js';
export { PasswordPolicyEngine } from './security/password-policy.js';
export type {
  PasswordPolicyConfig,
  PasswordStrengthResult,
  PasswordValidationResult,
} from './security/password-policy.js';
export { DbEncryption, getDbEncryption } from './security/db-encryption.js';
export { PasswordResetEngine } from './security/password-reset.js';
export type { PasswordResetTokenData } from './security/password-reset.js';
export { TwoFactorEngine } from './security/two-factor.js';
export type { TwoFactorSecretData, BackupCodesData } from './security/two-factor.js';

// ─── Shortcodes ─────────────────────────────────────────
export {
  ShortcodeEngine,
  ShortcodeRegistry,
  processContent,
  doShortcode,
  stripShortcodes,
  registerShortcode,
} from './shortcode/shortcode-engine.js';
export type { ShortcodeHandler } from './shortcode/shortcode-engine.js';

// ─── oEmbed ─────────────────────────────────────────────
export {
  OEmbedService,
  OEmbedRegistry,
  OEmbedResolver,
  OEmbedProxy,
} from './oembed/oembed-service.js';
export type { OEmbedProviderConfig, OEmbedResult } from './oembed/oembed-service.js';

// ─── Permalink ──────────────────────────────────────────
export {
  PermalinkService,
  PermalinkManager,
  parseStructure,
  generateUrl,
  matchUrl,
  isValidTag,
  getDefaultStructures,
  PERMALINK_TAGS,
} from './permalink/permalink-service.js';
export type {
  PermalinkTag,
  PermalinkParts,
  ParsedStructure,
  PermalinkSettings,
  PermalinkStorage,
} from './permalink/permalink-service.js';

// ─── Comments ───────────────────────────────────────────
export {
  CommentService,
  CommentModeration,
  CommentWhitelist,
  CommentStatus,
} from './comments/index.js';
export type {
  CommentData,
  CommentTree,
  ModerationRule,
  ModerationResult,
  WhitelistedCommenter,
} from './comments/index.js';

// ─── Media ──────────────────────────────────────────────
export { MediaService } from './media/media-service.js';
export type { MediaUploadOptions, ImageSize } from './media/media-service.js';

// ─── Cache ──────────────────────────────────────────────
export { CacheService } from './cache/cache-service.js';
export type { CacheOptions, CacheEntry, ObjectCache, CacheStats } from './cache/cache-service.js';

// ─── Config ─────────────────────────────────────────────
export { ConfigService } from './config/config-service.js';

// ─── SEO ────────────────────────────────────────────────
export { SeoService } from './seo/seo-service.js';
export type { SeoMetadata, SeoContentEntry } from './seo/seo-service.js';

// ─── Editor Patterns ────────────────────────────────────
export {
  BLOCK_PATTERNS,
  getPatternsByCategory,
  getPatternByName,
  PATTERN_CATEGORIES,
} from './editor/block-patterns.js';
export type { EditorPattern } from './editor/block-patterns.js';

// ─── Operational ────────────────────────────────────────
export { UpgradeManager } from './upgrade/upgrade-manager.js';
export type { VersionInfo, MigrationResult, UpgradeOptions } from './upgrade/upgrade-manager.js';

export { BackupManager } from './backup/backup-manager.js';
export type {
  BackupRecord,
  BackupOptions,
  BackupType,
  BackupStatus,
  StorageProvider,
  RetentionConfig,
} from './backup/backup-manager.js';

export { MailManager } from './mail/mail-manager.js';
export type { MailOptions, MailResult, MailProvider, MailLog } from './mail/mail-manager.js';

export { LogManager } from './logging/log-manager.js';
export type { LogEntry, LogLevel, LogFilter, LogFileInfo } from './logging/log-manager.js';

export { I18nEngine } from './i18n/i18n-engine.js';
export type { I18nOptions, LocaleInfo } from './i18n/i18n-engine.js';

export { CronViewer } from './cron/cron-viewer.js';
export type { CronEvent, CronStatus, CronEventFilter } from './cron/cron-viewer.js';

export { DbOptimizer } from './db/db-optimizer.js';
export type { TableInfo, CleanupResult, CleanupOptions } from './db/db-optimizer.js';

export { SchedulerService } from './scheduler/scheduler.js';
export type { ScheduledJob, JobExecution, QueueStats } from './scheduler/scheduler.js';

export {
  calculateNextRun,
  parseCronExpression,
  validateCronExpression,
  describeCronExpression,
  estimateCronIntervalMs,
} from './scheduler/cron-parser.js';
export type { CronFields, CronField } from './scheduler/cron-parser.js';

// ─── Developer Tools ────────────────────────────────────
export {
  queryMonitor,
  installQueryMonitor,
  getQueryStats,
  getNplusOnePatterns,
  clearQueryHistory,
} from './dev/index.js';
export type { QueryRecord, QueryMonitorStats } from './dev/index.js';

// ─── Errors ─────────────────────────────────────────────
export {
  LeveledError,
  WarningError,
  DeprecationError,
  StrictModeError,
  NoticeError,
  deprecate,
  triggerDeprecationWarning,
  resetDeprecationCache,
  suppressErrors,
  isDebugMode,
} from './errors/error-levels.js';
export type {
  ErrorLevel,
  ErrorLevelOptions,
  DeprecationWarningOptions,
} from './errors/error-levels.js';

// ─── Core Engine ────────────────────────────────────────

import { ContentEngine } from './content/content-engine.js';
import { PluginEngine } from './plugin/plugin-engine.js';
import { ThemeEngine } from './theme/theme-engine.js';
import { AuthService } from './auth/auth-service.js';
import { MediaService } from './media/media-service.js';
import { CacheService } from './cache/cache-service.js';
import { ShortcodeEngine } from './shortcode/shortcode-engine.js';
import { OEmbedService } from './oembed/oembed-service.js';
import { PermalinkService } from './permalink/permalink-service.js';
import { SecurityService } from './security/security-service.js';
import { RecoveryMode } from './security/recovery-mode.js';
import { ApplicationPasswordsEngine } from './security/application-passwords.js';
import { PasswordPolicyEngine } from './security/password-policy.js';
import { DbEncryption } from './security/db-encryption.js';
import { PasswordResetEngine } from './security/password-reset.js';
import { TwoFactorEngine } from './security/two-factor.js';
import { ConfigService } from './config/config-service.js';
import { UpgradeManager } from './upgrade/upgrade-manager.js';
import { BackupManager } from './backup/backup-manager.js';
import { LogManager } from './logging/log-manager.js';
import { I18nEngine } from './i18n/i18n-engine.js';
import { CronViewer } from './cron/cron-viewer.js';
import { DbOptimizer } from './db/db-optimizer.js';
import { MailManager } from './mail/mail-manager.js';
import { SchedulerService } from './scheduler/scheduler.js';

export interface NodePressEngineOptions {
  config: ConfigService;
  content: ContentEngine;
  plugins: PluginEngine;
  themes: ThemeEngine;
  auth: AuthService;
  media: MediaService;
  cache: CacheService;
  shortcode: ShortcodeEngine;
  oembed: OEmbedService;
  permalink: PermalinkService;
  security: SecurityService;
  recoveryMode?: RecoveryMode;
  appPasswordsEngine?: ApplicationPasswordsEngine;
  passwordPolicyEngine?: PasswordPolicyEngine;
  dbEncryption?: DbEncryption;
  passwordResetEngine?: PasswordResetEngine;
  twoFactorEngine?: TwoFactorEngine;
  upgrade?: UpgradeManager;
  backup?: BackupManager;
  logs?: LogManager;
  i18n?: I18nEngine;
  cron?: CronViewer;
  dbOptimizer?: DbOptimizer;
  mail?: MailManager;
  scheduler?: SchedulerService;
}

/**
 * NodePressEngine — the main orchestrator that wires all core services together.
 */
export class NodePressEngine {
  public readonly config: ConfigService;
  public readonly content: ContentEngine;
  public readonly plugins: PluginEngine;
  public readonly themes: ThemeEngine;
  public readonly auth: AuthService;
  public readonly media: MediaService;
  public readonly cache: CacheService;
  public readonly shortcode: ShortcodeEngine;
  public readonly oembed: OEmbedService;
  public readonly permalink: PermalinkService;
  public readonly security: SecurityService;
  public readonly upgrade?: UpgradeManager;
  public readonly backup?: BackupManager;
  public readonly logs?: LogManager;
  public readonly i18n?: I18nEngine;
  public readonly cron?: CronViewer;
  public readonly dbOptimizer?: DbOptimizer;
  public readonly mail?: MailManager;
  public readonly scheduler?: SchedulerService;

  constructor(options: NodePressEngineOptions) {
    this.config = options.config;
    this.content = options.content;
    this.plugins = options.plugins;
    this.themes = options.themes;
    this.auth = options.auth;
    this.media = options.media;
    this.cache = options.cache;
    this.shortcode = options.shortcode;
    this.oembed = options.oembed;
    this.permalink = options.permalink;
    this.security = options.security;
    this.upgrade = options.upgrade;
    this.backup = options.backup;
    this.logs = options.logs;
    this.i18n = options.i18n;
    this.cron = options.cron;
    this.dbOptimizer = options.dbOptimizer;
    this.mail = options.mail;
    this.scheduler = options.scheduler;
  }

  async initialize(): Promise<void> {
    await this.security.initialize();
    await this.plugins.bootActivePlugins();
    await this.cache.initialize();
    await this.scheduler?.initialize();
    await this.cron?.initialize();
  }

  async shutdown(): Promise<void> {
    await this.plugins.shutdown();
    await this.cache.shutdown();
    await this.scheduler?.shutdown();
    await this.cron?.shutdown();
  }
}
