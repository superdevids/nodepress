/**
 * Block Variations (Gap E-05)
 *
 * Pre-configured instances of blocks that appear in the inserter.
 */

import { blockRegistry } from "../block-api.js";
import type { BlockVariationDef } from "../types.js";

export type { BlockVariationDef } from "../types.js";

export function registerBlockVariation(blockName: string, variation: BlockVariationDef): void {
  blockRegistry.registerBlockVariation(blockName, variation);
}

export function getBlockVariations(blockName: string): BlockVariationDef[] {
  return blockRegistry.getBlockVariations(blockName);
}

registerBlockVariation("core/embed", {
  name: "youtube",
  title: "YouTube",
  icon: "youtube",
  description: "Embed a YouTube video",
  attributes: { providerNameSlug: "youtube", responsive: true },
  scope: ["inserter"],
  keywords: ["video", "youtube", "embed"],
});

registerBlockVariation("core/embed", {
  name: "twitter",
  title: "X (Twitter)",
  icon: "twitter",
  description: "Embed an X (Twitter) post",
  attributes: { providerNameSlug: "twitter", responsive: true },
  scope: ["inserter"],
});

registerBlockVariation("core/embed", {
  name: "vimeo",
  title: "Vimeo",
  icon: "vimeo",
  description: "Embed a Vimeo video",
  attributes: { providerNameSlug: "vimeo", responsive: true },
  scope: ["inserter"],
});

registerBlockVariation("core/embed", {
  name: "github",
  title: "GitHub Gist",
  icon: "github",
  description: "Embed a GitHub Gist",
  attributes: { providerNameSlug: "github", responsive: true },
  scope: ["inserter"],
});

registerBlockVariation("core/columns", {
  name: "50-50",
  title: "Two columns (50/50)",
  description: "Split into two equal columns",
  attributes: { columns: 2, layout: "50-50" },
  scope: ["inserter"],
});

registerBlockVariation("core/columns", {
  name: "70-30",
  title: "Two columns (70/30)",
  description: "Split into 70/30 layout",
  attributes: { columns: 2, layout: "70-30" },
  scope: ["inserter"],
});

registerBlockVariation("core/columns", {
  name: "30-70",
  title: "Two columns (30/70)",
  description: "Split into 30/70 layout",
  attributes: { columns: 2, layout: "30-70" },
  scope: ["inserter"],
});

registerBlockVariation("core/columns", {
  name: "33-33-33",
  title: "Three columns (equal)",
  description: "Three equal columns",
  attributes: { columns: 3, layout: "33-33-33" },
  scope: ["inserter"],
});

registerBlockVariation("core/columns", {
  name: "25-25-25-25",
  title: "Four columns (equal)",
  description: "Four equal columns",
  attributes: { columns: 4, layout: "25-25-25-25" },
  scope: ["inserter"],
});