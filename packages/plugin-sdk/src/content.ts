/**
 * Content type registration for plugins.
 * Allows plugins to define custom content types and fields.
 */

export type FieldType =
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url'
  | 'media'
  | 'relation'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'repeater';

export interface FieldDefinition {
  type: FieldType;
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  instructions?: string;
  min?: number;
  max?: number;
  options?: { label: string; value: string }[];
  multiple?: boolean;
  relation?: { to: string; many: boolean };
  fields?: Record<string, FieldDefinition>;
}

export interface ContentTypeDefinition {
  name: string;
  label: { singular: string; plural: string };
  description?: string;
  fields: Record<string, FieldDefinition>;
  taxonomies?: string[];
  supports?: string[];
  menuIcon?: string;
  menuPosition?: number;
}

const registeredContentTypes = new Map<string, ContentTypeDefinition>();

/**
 * Register a content type from a plugin.
 */
export function registerContentType(def: ContentTypeDefinition): void {
  if (registeredContentTypes.has(def.name)) {
    throw new Error(`Content type "${def.name}" is already registered.`);
  }
  registeredContentTypes.set(def.name, def);
}

/**
 * Create a field definition.
 */
export function defineField(type: FieldType, def: Omit<FieldDefinition, 'type'>): FieldDefinition {
  return { ...def, type };
}

/**
 * Get all content types registered by plugins.
 */
export function getPluginContentTypes(): ContentTypeDefinition[] {
  return Array.from(registeredContentTypes.values());
}
