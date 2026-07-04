/**
 * @nodepress/plugin-sdk
 *
 * Plugin Development Kit for NodePress.
 * Provides types, helpers, and interfaces for building plugins.
 *
 * Plugin developers import this package to:
 * - Register hooks (actions & filters)
 * - Define content types
 * - Register custom blocks
 * - Add admin settings pages
 * - Schedule cron jobs
 * - Declare capabilities
 * - Register shortcodes
 */

export { HookRegistry, type HookCallback, type HookEvent } from './hooks.js';

export {
  registerContentType,
  defineField,
  type ContentTypeDefinition,
  type FieldDefinition,
  type FieldType,
} from './content.js';

export { registerBlock, type BlockDefinition, type BlockEditorProps } from './blocks.js';

export { registerSetting, type SettingDefinition, type SettingField } from './settings.js';

export { registerCron, type CronJob, type CronSchedule } from './cron.js';

export { registerCapability, type CapabilityDefinition } from './capabilities.js';

export { registerShortcode, type ShortcodeHandler } from './shortcode.js';

export { PluginStorage, createPluginStorage, type PluginStorageOptions } from './storage.js';

import type { PrismaClient } from '@prisma/client';

/**
 * Plugin manifest interface.
 * Every plugin should export a `manifest` object with these fields.
 */
export interface PluginManifest {
  slug: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  requires?: string; // semver range for core version
  permissions?: string[];
}

/**
 * Plugin lifecycle hooks.
 * Plugins export a `lifecycle` object to hook into key events.
 */
export interface PluginLifecycle {
  install?: () => Promise<void>;
  activate?: () => Promise<void>;
  boot?: (context: PluginContext) => Promise<void>;
  deactivate?: () => Promise<void>;
  uninstall?: () => Promise<void>;
}

/**
 * Plugin context provided at boot time.
 */
export interface PluginContext {
  hooks: HookRegistry;
  prisma: PrismaClient;
  cache: Map<string, unknown>;
  shortcode?: {
    register: (
      tag: string,
      handler: (attrs: Record<string, string>, content?: string) => string | Promise<string>,
      description?: string,
    ) => void;
  };
  logger: Console;
}
