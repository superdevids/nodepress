/**
 * Shortcode registration for plugins.
 * Allows plugins to register custom shortcodes.
 *
 * @example
 * import { registerShortcode } from "@nodepressjs/plugin-sdk";
 *
 * registerShortcode("my_plugin_button", (attrs, content) => {
 *   const url = attrs.url ?? "#";
 *   return `<a href="${url}" class="my-button">${content ?? "Click me"}</a>`;
 * });
 */

export type ShortcodeHandler = (attrs: Record<string, string>, content?: string) => string | Promise<string>;

interface ShortcodeRegistration {
  tag: string;
  handler: ShortcodeHandler;
  description?: string;
}

const registeredShortcodes = new Map<string, ShortcodeRegistration>();

/**
 * Register a shortcode from a plugin.
 */
export function registerShortcode(tag: string, handler: ShortcodeHandler, description?: string): void {
  if (registeredShortcodes.has(tag)) {
    throw new Error(`Shortcode "[${tag}]" is already registered.`);
  }
  registeredShortcodes.set(tag, { tag, handler, description });
}

/**
 * Get all registered shortcodes.
 */
export function getRegisteredShortcodes(): ShortcodeRegistration[] {
  return Array.from(registeredShortcodes.values());
}
