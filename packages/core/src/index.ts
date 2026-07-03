/**
 * @nodepress/core
 *
 * The business logic engine for NodePress.
 * Orchestrates content management, plugin lifecycle, authentication,
 * media handling, caching, and all core CMS operations.
 */

// ─── Content Engine ────────────────────────────────────────
export {
  ContentEngine,
  defineContentType,
  field,
  type ContentTypeDefinition,
  type FieldDefinition,
  type FieldType,
} from "./content/content-engine.js";

// ─── Post Formats (Gap A-04) ───────────────────────────────
export {
  PostFormats,
  PostFormat,
  POST_FORMATS,
  POST_FORMAT_LABELS,
  isPostFormat,
  type PostFormatValidation,
} from "./content/post-formats.js";

// ─── Sticky Posts (Gap A-05) ───────────────────────────────
export {
  StickyPosts,
  type StickyPostEntry,
} from "./content/sticky-posts.js";

// ─── Password Content (Gap A-06) ───────────────────────────
export {
  PasswordContent,
  type PasswordContentEntry,
  type UnlockResult,
} from "./content/password-content.js";

// ─── Featured Image (Gap A-08) ─────────────────────────────
export {
  FeaturedImage,
  type FeaturedImageData,
  type ThumbnailSize,
} from "./content/featured-image.js";

// ─── Page Templates (Gap A-09) ─────────────────────────────
export {
  PageTemplateRegistry,
  PageTemplateResolver,
  type PageTemplate,
  type PageTemplateData,
} from "./content/page-templates.js";

// ─── Plugin System ─────────────────────────────────────────
export {
  PluginEngine,
  type PluginManifest,
  type PluginLifecycle,
} from "./plugin/plugin-engine.js";

export {
  HookRegistry,
  type HookEvent,
} from "./plugin/hook-registry.js";

// ─── Theme Engine ──────────────────────────────────────────
export {
  ThemeEngine,
  type ThemeManifest,
  type TemplateHierarchy,
} from "./theme/theme-engine.js";

// ─── Theme Subsystems (Phase 5) ────────────────────────────

// Child Theme System (Gap D-01)
export {
  ChildThemeResolver,
  generateChildThemeConfig,
  type ChildThemeManifest,
  type ResolvedTemplatePath,
} from "./theme/child-theme-resolver.js";

// theme.json Parser (Gap D-02)
export {
  ThemeJsonParser,
  type ThemeJson,
  type ThemeJsonSettings,
  type ThemeJsonStyles,
  type ThemeJsonColorPalette,
  type ThemeJsonGradient,
  type ThemeJsonFontSize,
  type ThemeJsonFontFamily,
  type ThemeJsonTypographySettings,
  type ThemeJsonColorSettings,
  type ThemeJsonSpacingSettings,
  type ThemeJsonLayoutSettings,
  type ThemeJsonBlockStyles,
  type ThemeJsonCustomTemplate,
  type ThemeJsonStyleVariation,
  type CssCustomProperty,
} from "./theme/theme-json-parser.js";

// Template Parts (Gap D-05)
export {
  TemplatePartsManager,
  type TemplatePartDefinition,
  type TemplatePartRecord,
} from "./theme/template-parts.js";

// Block Patterns (Gap D-04)
export {
  BlockPatternsManager,
  type BlockPatternDefinition,
  type BlockPatternRecord,
  type BlockPatternCategory,
  type BlockPatternCategoryDef,
} from "./theme/block-patterns.js";

// Theme Customizer (Gap D-03)
export {
  ThemeCustomizer,
  type CustomizerField,
  type CustomizerFieldType,
  type CustomizerSection,
  type CustomizerPanel,
  type SelectiveRefreshRule,
  type PreviewDevice,
  type ThemePreviewState,
} from "./theme/theme-customizer.js";

// Block Areas / Widget Areas (Gap D-08)
export {
  BlockAreasManager,
  BlockAreaRenderer,
  type BlockAreaDefinition,
  type BlockAreaRecord,
} from "./theme/block-areas.js";

// Theme Setup Functions (Gap D-07)
export {
  ThemeSetupManager,
  type ThemeSetupContext,
  type ThemeSetupFn,
  type ThemeSetupConfig,
  type ThemeSetupImageSize,
} from "./theme/theme-setup.js";

// Theme Feature Support (Gap D-09)
export {
  ThemeSupportsManager,
  ThemeFeature,
  type ThemeFeatureEffect,
} from "./theme/theme-supports.js";

// Navigation Menu Locations (Gap D-10)
export {
  NavMenuLocationsManager,
  type NavMenuLocationDef,
  type NavMenuLocationRecord,
  type NavMenuTreeItem,
  type NavMenuTree,
} from "./theme/nav-menu-locations.js";

// Theme Branding (Gap D-11)
export {
  ThemeBrandingManager,
  type ThemeBrandingSettings,
  type ThemeModValue,
  type ThemeModKey,
} from "./theme/theme-branding.js";

// Theme Auto-Update (Gap D-13)
export {
  ThemeAutoUpdater,
  type ThemeAutoUpdateConfig,
  type ThemeUpdateInfo,
  type ThemeUpdateResult,
  type AutoUpdateMode,
} from "./theme/theme-auto-updater.js";

// Theme Preview (Gap D-14)
export {
  ThemePreviewManager,
  parsePreviewCookie,
  PREVIEW_COOKIE_NAME,
  type ThemePreviewState,
} from "./theme/theme-preview.js";

// Style Variations (Gap D-16)
export {
  StyleVariationsManager,
  type StyleVariationDef,
  type StyleVariationRecord,
} from "./theme/style-variations.js";

// Full Template Hierarchy (Gap D-19)
export {
  TemplateHierarchyResolver,
  type TemplateType,
  type TemplateResolutionContext,
  type ResolvedTemplate,
} from "./theme/template-hierarchy.js";

// ─── Authentication ────────────────────────────────────────
export {
  AuthService,
  type AuthTokens,
  type LoginInput,
  type RegisterInput,
} from "./auth/auth-service.js";

export {
  CapabilityService,
  type Capability,
  type RoleDefinition,
} from "./auth/capability-service.js";

// ─── Media ─────────────────────────────────────────────────
export {
  MediaService,
  type MediaUploadOptions,
  type ImageSize,
} from "./media/media-service.js";

// ─── Cache (Gap G-01) ──────────────────────────────────────
export {
  CacheService,
  type CacheOptions,
  type CacheEntry,
  type ObjectCache,
  type CacheStats,
} from "./cache/cache-service.js";

// ─── Shortcode (Gap A-01) ──────────────────────────────────
export {
  ShortcodeEngine,
  ShortcodeRegistry,
  processContent,
  doShortcode,
  stripShortcodes,
  registerShortcode,
  type ShortcodeHandler,
} from "./shortcode/shortcode-engine.js";

// ─── oEmbed (Gap A-02) ─────────────────────────────────────
export {
  OEmbedService,
  OEmbedRegistry,
  OEmbedResolver,
  OEmbedProxy,
  type OEmbedProviderConfig,
  type OEmbedResult,
} from "./oembed/oembed-service.js";

// ─── Permalink (Gap A-03) ──────────────────────────────────
export {
  PermalinkService,
  PermalinkManager,
  parseStructure,
  generateUrl,
  matchUrl,
  isValidTag,
  getDefaultStructures,
  PERMALINK_TAGS,
  type PermalinkTag,
  type PermalinkParts,
  type ParsedStructure,
  type PermalinkSettings,
  type PermalinkStorage,
} from "./permalink/permalink-service.js";

// ─── Comments (Gap A-13) ───────────────────────────────────
export {
  CommentService,
  CommentModeration,
  CommentWhitelist,
  CommentStatus,
  type CommentData,
  type CommentTree,
  type ModerationRule,
  type ModerationResult,
  type WhitelistedCommenter,
} from "./comments/index.js";

// ─── Security (Gap F-01) ───────────────────────────────────
export {
  SecurityService,
  type SecurityKeys,
} from "./security/security-service.js";

// ─── Recovery Mode (Gap F-02) ──────────────────────────────
export {
  RecoveryMode,
  type PluginErrorRecord,
} from "./security/recovery-mode.js";

// ─── Application Passwords (Gap F-04) ──────────────────────
export {
  ApplicationPasswordsEngine,
  type AppPasswordData,
} from "./security/application-passwords.js";

// ─── Password Policy (Gap F-06) ────────────────────────────
export {
  PasswordPolicyEngine,
  defaultPasswordPolicy,
  type PasswordPolicyConfig,
  type PasswordStrengthResult,
  type PasswordValidationResult,
} from "./security/password-policy.js";

// ─── Database Encryption (Gap F-15) ────────────────────────
export {
  DbEncryption,
  getDbEncryption,
  encryptField,
  decryptField,
} from "./security/db-encryption.js";

// ─── Password Reset ────────────────────────────────────────
export {
  PasswordResetEngine,
  type PasswordResetTokenData,
} from "./security/password-reset.js";

// ─── Two-Factor Auth ───────────────────────────────────────
export {
  TwoFactorEngine,
  type TwoFactorSecretData,
  type BackupCodesData,
} from "./security/two-factor.js";

// ─── SEO ───────────────────────────────────────────────────
export { SeoService } from "./seo/seo-service.js";
export type { SeoMetadata, SeoContentEntry } from "./seo/seo-service.js";

// ─── Config ────────────────────────────────────────────────
export { ConfigService } from "./config/config-service.js";

// ─── Phase 8 — Operational Full ──────────────────────────────

// Upgrade Manager (Gap I-01)
export { UpgradeManager, type VersionInfo, type MigrationResult, type UpgradeOptions } from "./upgrade/upgrade-manager.js";

// Backup Manager (Gap I-02)
export {
  BackupManager,
  LocalStorageProvider,
  S3StorageProvider,
  type BackupRecord,
  type BackupOptions,
  type BackupType,
  type BackupStatus,
  type StorageProvider,
  type RetentionConfig,
} from "./backup/backup-manager.js";

// Log Manager (Gap I-10)
export { LogManager, type LogEntry, type LogLevel, type LogFilter, type LogFileInfo } from "./logging/log-manager.js";

// i18n / Translation (Gap I-13)
export { I18nEngine, type I18nOptions, type LocaleInfo } from "./i18n/i18n-engine.js";

// Cron Viewer (Gap I-14)
export { CronViewer, type CronEvent, type CronStatus, type CronEventFilter } from "./cron/cron-viewer.js";

// DB Optimizer (Gap I-12)
export { DbOptimizer, type TableInfo, type CleanupResult, type CleanupOptions } from "./db/db-optimizer.js";

// Mail / Email System (Gap I-03)
export {
  MailManager,
  SmtpProvider,
  ResendProvider,
  SendGridProvider,
  SesProvider,
  type MailOptions,
  type MailResult,
  type MailProvider,
  type MailLog,
} from "./mail/mail-manager.js";

// Scheduler Service
export { SchedulerService, type ScheduledJob, type JobExecution, type QueueStats } from "./scheduler/scheduler.js";

// ─── Core Engine ───────────────────────────────────────────

import { ContentEngine } from "./content/content-engine.js";
import { PluginEngine } from "./plugin/plugin-engine.js";
import { ThemeEngine } from "./theme/theme-engine.js";
import { AuthService } from "./auth/auth-service.js";
import { MediaService } from "./media/media-service.js";
import { CacheService } from "./cache/cache-service.js";
import { ShortcodeEngine } from "./shortcode/shortcode-engine.js";
import { OEmbedService } from "./oembed/oembed-service.js";
import { PermalinkService } from "./permalink/permalink-service.js";
import { SecurityService } from "./security/security-service.js";
import { RecoveryMode } from "./security/recovery-mode.js";
import { ApplicationPasswordsEngine } from "./security/application-passwords.js";
import { PasswordPolicyEngine } from "./security/password-policy.js";
import { DbEncryption } from "./security/db-encryption.js";
import { PasswordResetEngine } from "./security/password-reset.js";
import { TwoFactorEngine } from "./security/two-factor.js";
import { ConfigService } from "./config/config-service.js";
import { UpgradeManager } from "./upgrade/upgrade-manager.js";
import { BackupManager } from "./backup/backup-manager.js";
import { LogManager } from "./logging/log-manager.js";
import { I18nEngine } from "./i18n/i18n-engine.js";
import { CronViewer } from "./cron/cron-viewer.js";
import { DbOptimizer } from "./db/db-optimizer.js";
import { MailManager } from "./mail/mail-manager.js";
import { SchedulerService } from "./scheduler/scheduler.js";

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
