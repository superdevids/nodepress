/**
 * Core type definitions for the block editor.
 */

import type { Editor } from "@tiptap/core";

export interface BlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlockNode[];
  text?: string;
  marks?: Mark[];
}

export interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface BlockContent {
  type: "doc";
  content: BlockNode[];
}

export interface EditorConfig {
  placeholder?: string;
  editable?: boolean;
  autofocus?: boolean;
}

export interface BlockSupports {
  align: boolean | ("left" | "center" | "right" | "wide" | "full")[];
  anchor: boolean;
  customClassName: boolean;
  html: boolean;
  multiple: boolean;
  reusable: boolean;
  color: {
    background: boolean;
    text: boolean;
    gradients: boolean;
  };
  typography: {
    fontSize: boolean;
    lineHeight: boolean;
    fontFamily?: boolean;
  };
  spacing: {
    padding: boolean;
    margin: boolean;
  };
  border: boolean;
  shadow: boolean;
}

export type BlockCategory = "text" | "media" | "design" | "widgets" | "theme" | "embeds" | string;

export interface BlockDeclaration {
  name: string;
  title: string;
  icon?: string;
  category: BlockCategory;
  description?: string;
  keywords?: string[];
  supports: BlockSupports;
  attributes?: Record<string, BlockAttributeDef>;
  render?: (attrs: Record<string, unknown>, children?: string) => string;
  edit?: React.ComponentType<{ attrs: Record<string, unknown>; onChange: (attrs: Record<string, unknown>) => void; editor?: Editor }>;
}

export interface BlockAttributeDef {
  type: "string" | "number" | "boolean" | "object" | "array";
  default?: unknown;
  description?: string;
}

export interface BlockCategoryDef {
  name: string;
  title: string;
  icon: string;
  priority: number;
}

export interface BlockStyleDef {
  name: string;
  label: string;
  style: Record<string, string>;
  preview?: Record<string, string>;
}

export interface BlockVariationDef {
  name: string;
  title: string;
  icon?: string;
  description?: string;
  attributes: Record<string, unknown>;
  isDefault?: boolean;
  scope?: ("inserter" | "block" | "transform")[];
  keywords?: string[];
}

export interface BlockTransformDef {
  from: string;
  to: string;
  transform: (attrs: Record<string, unknown>, content: BlockNode[]) => { attrs: Record<string, unknown>; content: BlockNode[] };
}

export interface DynamicBlockDef {
  name: string;
  title: string;
  icon: string;
  category: BlockCategory;
  description?: string;
  attributes: Record<string, BlockAttributeDef>;
  supports: Partial<BlockSupports>;
  render: (attrs: Record<string, unknown>, context: DynamicBlockContext) => Promise<string>;
  cacheTTL?: number;
}

export interface DynamicBlockContext {
  prisma?: unknown;
  redis?: unknown;
  req?: Request;
}

export interface ReusableBlockData {
  id: string;
  name: string;
  content: BlockNode[];
  synced: boolean;
  usageCount: number;
}

export interface BlockLock {
  move: boolean;
  remove: boolean;
  edit: boolean;
}

export interface BlockInserterGroup {
  category: BlockCategoryDef;
  blocks: BlockDeclaration[];
}

export type SerializedBlock = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: SerializedBlock[];
  text?: string;
  marks?: Mark[];
  lock?: BlockLock;
};