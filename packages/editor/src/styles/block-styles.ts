/**
 * Block Styles (Gap E-04)
 *
 * Alternate visual styles per block. Rendered as a dropdown in the toolbar
 * when a block is selected. Supports preview on hover.
 */

import { blockRegistry } from "../block-api.js";
import type { BlockStyleDef } from "../types.js";

export type { BlockStyleDef } from "../types.js";

export function registerBlockStyle(blockName: string, style: BlockStyleDef): void {
  blockRegistry.registerBlockStyle(blockName, style);
}

export function getBlockStyles(blockName: string): BlockStyleDef[] {
  return blockRegistry.getBlockStyles(blockName);
}

export function applyBlockStyle(blockName: string, styleName: string): Record<string, string> {
  const styles = getBlockStyles(blockName);
  const style = styles.find((s) => s.name === styleName);
  return style?.style ?? {};
}

registerBlockStyle("core/quote", {
  name: "large",
  label: "Large",
  style: { fontSize: "1.5em", fontStyle: "italic", fontWeight: "300" },
  preview: { fontSize: "1.3em" },
});

registerBlockStyle("core/quote", {
  name: "plain",
  label: "Plain",
  style: { border: "none", background: "transparent", padding: "0" },
});

registerBlockStyle("core/quote", {
  name: "red-quote",
  label: "Red Quote",
  style: { borderLeft: "4px solid #ef4444", background: "#fef2f2", color: "#991b1b" },
});

registerBlockStyle("core/heading", {
  name: "default",
  label: "Default",
  style: {},
});

registerBlockStyle("core/heading", {
  name: "highlight",
  label: "Highlight",
  style: { background: "#fef9c3", padding: "0.25em 0.5em", borderRadius: "4px", display: "inline-block" },
});

registerBlockStyle("core/button", {
  name: "outline",
  label: "Outline",
  style: { background: "transparent", border: "2px solid currentColor" },
});

registerBlockStyle("core/button", {
  name: "fill",
  label: "Fill",
  style: {},
});

registerBlockStyle("core/button", {
  name: "ghost",
  label: "Ghost",
  style: { background: "transparent", border: "none", opacity: "0.8" },
});

registerBlockStyle("core/image", {
  name: "rounded",
  label: "Rounded",
  style: { borderRadius: "12px" },
});

registerBlockStyle("core/image", {
  name: "circle",
  label: "Circle",
  style: { borderRadius: "50%", aspectRatio: "1" },
});

registerBlockStyle("core/image", {
  name: "shadow",
  label: "Shadow",
  style: { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
});