/**
 * Block Categories (Gap E-03)
 *
 * WordPress-style block categories for organizing blocks in the inserter.
 * Plugins can register new categories.
 */

import { blockRegistry } from "../block-api.js";
import type { BlockCategoryDef } from "../types.js";

export type { BlockCategoryDef, BlockCategory } from "../types.js";

export function registerBlockCategory(cat: BlockCategoryDef): void {
  blockRegistry.registerCategory(cat);
}

export function getBlockCategories(): BlockCategoryDef[] {
  return blockRegistry.getCategories();
}

export function getBlockCategory(name: string): BlockCategoryDef | undefined {
  return blockRegistry.getCategory(name);
}

registerBlockCategory({ name: "text", title: "Text", icon: "text", priority: 1 });
registerBlockCategory({ name: "media", title: "Media", icon: "image", priority: 2 });
registerBlockCategory({ name: "design", title: "Design", icon: "palette", priority: 3 });
registerBlockCategory({ name: "widgets", title: "Widgets", icon: "puzzle", priority: 4 });
registerBlockCategory({ name: "theme", title: "Theme", icon: "layout", priority: 5 });
registerBlockCategory({ name: "embeds", title: "Embeds", icon: "code", priority: 6 });