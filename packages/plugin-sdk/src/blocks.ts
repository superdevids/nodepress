/**
 * Block registration for plugins.
 * Allows plugins to register custom blocks for the Tiptap block editor.
 */

import type React from "react";

export interface BlockEditorProps {
  node: Record<string, unknown>;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  editor: unknown;
}

export interface BlockDefinition {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  keywords?: string[];
  attributes?: Record<string, { type: string; default?: unknown }>;
  component: React.ComponentType<BlockEditorProps>;
  parse?: (element: HTMLElement) => Record<string, unknown>;
  serialize?: (attrs: Record<string, unknown>) => string;
}

const registeredBlocks = new Map<string, BlockDefinition>();

/**
 * Register a block for the block editor.
 */
export function registerBlock(def: BlockDefinition): void {
  if (registeredBlocks.has(def.name)) {
    throw new Error(`Block "${def.name}" is already registered.`);
  }
  registeredBlocks.set(def.name, def);
}

/**
 * Get all registered blocks.
 */
export function getRegisteredBlocks(): BlockDefinition[] {
  return Array.from(registeredBlocks.values());
}
