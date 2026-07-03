/**
 * Settings API for plugins.
 * Allows plugins to register settings pages and individual settings.
 */

export interface SettingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "multiselect" | "email" | "url" | "password";
  defaultValue?: unknown;
  placeholder?: string;
  instructions?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
}

export interface SettingDefinition {
  pluginSlug: string;
  title: string;
  description?: string;
  fields: SettingField[];
  capabilities?: string[];
}

const registeredSettings = new Map<string, SettingDefinition>();

/**
 * Register a settings group for a plugin.
 * This will auto-generate a settings page in the admin panel.
 */
export function registerSetting(def: SettingDefinition): void {
  const key = `${def.pluginSlug}.${def.title}`;
  if (registeredSettings.has(key)) {
    throw new Error(`Setting "${key}" is already registered.`);
  }
  registeredSettings.set(key, def);
}

/**
 * Get all registered settings.
 */
export function getRegisteredSettings(): SettingDefinition[] {
  return Array.from(registeredSettings.values());
}

/**
 * Get settings for a specific plugin.
 */
export function getPluginSettings(pluginSlug: string): SettingDefinition[] {
  return Array.from(registeredSettings.values()).filter(
    (s) => s.pluginSlug === pluginSlug,
  );
}
