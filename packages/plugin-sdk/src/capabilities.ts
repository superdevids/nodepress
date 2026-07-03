/**
 * Capability system for plugins.
 * Allows plugins to register custom capabilities and integrate with the RBAC system.
 */

export interface CapabilityDefinition {
  name: string;
  label: string;
  description?: string;
  group?: string; // e.g., "content", "media", "plugins"
}

const registeredCapabilities = new Map<string, CapabilityDefinition>();

/**
 * Register a custom capability.
 * Plugins can use this to define new permissions that admins can assign to roles.
 *
 * @example
 * registerCapability({
 *   name: "content:product:export",
 *   label: "Export Products",
 *   description: "Allows exporting product data to CSV",
 *   group: "content",
 * });
 */
export function registerCapability(def: CapabilityDefinition): void {
  if (registeredCapabilities.has(def.name)) {
    throw new Error(`Capability "${def.name}" is already registered.`);
  }
  registeredCapabilities.set(def.name, def);
}

/**
 * Get all registered capabilities.
 */
export function getRegisteredCapabilities(): CapabilityDefinition[] {
  return Array.from(registeredCapabilities.values());
}

/**
 * Get capabilities by group.
 */
export function getCapabilitiesByGroup(group: string): CapabilityDefinition[] {
  return Array.from(registeredCapabilities.values()).filter(
    (c) => c.group === group,
  );
}
