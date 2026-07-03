export { type PluginManifest, type PluginLifecycle, type PluginBootContext, type PluginEngineOptions } from "./plugin-engine.js";

export { type DependencySpec, type DependencyResolution } from "./dependency-resolver.js";

export { type UpdateCheckResult } from "./registry-client.js";

export { type RollbackPoint, type BackupResult } from "./rollback-manager.js";

export { type UninstallHook } from "./uninstall-manager.js";

export { type SettingRegistration, type SettingFieldType } from "./settings-api.js";

export { type MuPlugin, type MuPluginManifest } from "./mu-plugin-loader.js";

export { type ActivationHook, type DeactivationHook } from "./activation-hooks.js";

export { type PluginCapability } from "./capability-registrar.js";

export { type PluginMigration } from "./db-migration.js";

export { type CronRegistration, type CronStatus } from "./cron-api.js";

export { type AssetDefinition, type EnqueuedScript, type EnqueuedStyle } from "./asset-registry.js";

export { type FileInfo, type FileContent, type FileSaveResult } from "./file-editor.js";

export { type PluginUpdateStatus, type AutoUpdateConfig } from "./auto-updater.js";

export { type I18nStrings } from "./plugin-i18n.js";

export { type SandboxConfig, type SandboxContext } from "./sandbox-manager.js";
