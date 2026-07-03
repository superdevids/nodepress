/**
 * Block API - Central registry for block types.
 */

import type {
  BlockDeclaration,
  BlockCategoryDef,
  BlockStyleDef,
  BlockVariationDef,
  BlockTransformDef,
  DynamicBlockDef,
  ReusableBlockData,
  BlockSupports,
  BlockCategory,
} from "./types.js";

class BlockRegistry {
  private blocks = new Map<string, BlockDeclaration>();
  private categories = new Map<string, BlockCategoryDef>();
  private styles = new Map<string, BlockStyleDef[]>();
  private variations = new Map<string, BlockVariationDef[]>();
  private transforms = new Map<string, BlockTransformDef[]>();
  private dynamicBlocks = new Map<string, DynamicBlockDef>();
  private reusableBlocks = new Map<string, ReusableBlockData>();

  registerBlock(decl: BlockDeclaration): void {
    this.blocks.set(decl.name, decl);
  }

  getBlock(name: string): BlockDeclaration | undefined {
    return this.blocks.get(name);
  }

  getBlocks(): BlockDeclaration[] {
    return Array.from(this.blocks.values());
  }

  getBlocksByCategory(category: BlockCategory): BlockDeclaration[] {
    return this.getBlocks().filter((b) => b.category === category);
  }

  registerCategory(cat: BlockCategoryDef): void {
    this.categories.set(cat.name, cat);
  }

  getCategory(name: string): BlockCategoryDef | undefined {
    return this.categories.get(name);
  }

  getCategories(): BlockCategoryDef[] {
    return Array.from(this.categories.values()).sort((a, b) => a.priority - b.priority);
  }

  registerBlockStyle(blockName: string, style: BlockStyleDef): void {
    const existing = this.styles.get(blockName) ?? [];
    existing.push(style);
    this.styles.set(blockName, existing);
  }

  getBlockStyles(blockName: string): BlockStyleDef[] {
    return this.styles.get(blockName) ?? [];
  }

  registerBlockVariation(blockName: string, variation: BlockVariationDef): void {
    const existing = this.variations.get(blockName) ?? [];
    existing.push(variation);
    this.variations.set(blockName, existing);
  }

  getBlockVariations(blockName: string): BlockVariationDef[] {
    return this.variations.get(blockName) ?? [];
  }

  registerBlockTransform(from: string, to: string, transform: BlockTransformDef["transform"]): void {
    const existing = this.transforms.get(from) ?? [];
    existing.push({ from, to, transform });
    this.transforms.set(from, existing);
  }

  getBlockTransforms(from: string): BlockTransformDef[] {
    return this.transforms.get(from) ?? [];
  }

  getTransformsTo(blockName: string): BlockTransformDef[] {
    return Array.from(this.transforms.values()).flat().filter((t) => t.to === blockName);
  }

  registerDynamicBlock(def: DynamicBlockDef): void {
    this.dynamicBlocks.set(def.name, def);
  }

  getDynamicBlock(name: string): DynamicBlockDef | undefined {
    return this.dynamicBlocks.get(name);
  }

  getDynamicBlocks(): DynamicBlockDef[] {
    return Array.from(this.dynamicBlocks.values());
  }

  registerReusableBlock(data: ReusableBlockData): void {
    this.reusableBlocks.set(data.id, data);
  }

  getReusableBlock(id: string): ReusableBlockData | undefined {
    return this.reusableBlocks.get(id);
  }

  getReusableBlocks(): ReusableBlockData[] {
    return Array.from(this.reusableBlocks.values());
  }

  removeReusableBlock(id: string): void {
    this.reusableBlocks.delete(id);
  }

  getDefaultSupports(): BlockSupports {
    return {
      align: false,
      anchor: false,
      customClassName: true,
      html: false,
      multiple: true,
      reusable: true,
      color: { background: false, text: false, gradients: false },
      typography: { fontSize: false, lineHeight: false, fontFamily: false },
      spacing: { padding: false, margin: false },
      border: false,
      shadow: false,
    };
  }

  getEffectiveSupports(blockName: string): BlockSupports {
    const block = this.blocks.get(blockName);
    if (!block) return this.getDefaultSupports();
    const defaults = this.getDefaultSupports();
    const merged: BlockSupports = {
      ...defaults,
      ...block.supports,
      color: { ...defaults.color, ...block.supports.color },
      typography: { ...defaults.typography, ...block.supports.typography },
      spacing: { ...defaults.spacing, ...block.supports.spacing },
    };
    return merged;
  }
}

export const blockRegistry = new BlockRegistry();