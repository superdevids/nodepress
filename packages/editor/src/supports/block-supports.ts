import { blockRegistry } from "../block-api.js";
import type { BlockSupports } from "../types.js";

export type { BlockSupports } from "../types.js";

export interface SupportsConfig {
  blockName: string;
  supports: BlockSupports;
}

export function getBlockSupports(blockName: string): BlockSupports {
  return blockRegistry.getEffectiveSupports(blockName);
}

export function hasAlignSupport(blockName: string, alignment?: string): boolean {
  const supports = getBlockSupports(blockName);
  if (typeof supports.align === "boolean") return supports.align;
  if (alignment) return (supports.align as string[]).includes(alignment);
  return (supports.align as string[]).length > 0;
}

export function hasColorSupport(blockName: string, type: "background" | "text" | "gradients"): boolean {
  const supports = getBlockSupports(blockName);
  return supports.color[type];
}

export function hasTypographySupport(blockName: string, feature: "fontSize" | "lineHeight" | "fontFamily"): boolean {
  const supports = getBlockSupports(blockName);
  return supports.typography[feature] === true;
}

export function hasSpacingSupport(blockName: string, dimension: "padding" | "margin"): boolean {
  const supports = getBlockSupports(blockName);
  return supports.spacing[dimension];
}

export function hasBorderSupport(blockName: string): boolean {
  return getBlockSupports(blockName).border;
}

export function hasShadowSupport(blockName: string): boolean {
  return getBlockSupports(blockName).shadow;
}

export function hasAnchorSupport(blockName: string): boolean {
  return getBlockSupports(blockName).anchor;
}

export function applySupportsToAttrs(blockName: string, attrs: Record<string, unknown>): Record<string, unknown> {
  const supports = getBlockSupports(blockName);
  const result: Record<string, unknown> = { ...attrs };

  if (supports.align && !result.align) {
    result.align = "";
  }
  if (supports.anchor && !result.anchor) {
    result.anchor = "";
  }
  if (supports.customClassName && !result.className) {
    result.className = "";
  }

  return result;
}

export function getSupportedToolbarControls(blockName: string): string[] {
  const controls: string[] = [];
  const supports = getBlockSupports(blockName);

  if (supports.align) controls.push("align");
  if (supports.color.background || supports.color.text) controls.push("color");
  if (supports.typography.fontSize) controls.push("fontSize");
  if (supports.border) controls.push("border");
  if (supports.anchor) controls.push("anchor");

  return controls;
}

export function buildBlockStyleFromSupports(_blockName: string, attrs: Record<string, unknown>): Record<string, string> {
  const style: Record<string, string> = {};

  if (attrs.textColor) {
    style.color = attrs.textColor as string;
  }
  if (attrs.backgroundColor) {
    style.backgroundColor = attrs.backgroundColor as string;
  }
  if (attrs.fontSize) {
    style.fontSize = attrs.fontSize as string;
  }
  if (attrs.padding) {
    const p = attrs.padding as Record<string, string>;
    if (p.top) style.paddingTop = p.top;
    if (p.right) style.paddingRight = p.right;
    if (p.bottom) style.paddingBottom = p.bottom;
    if (p.left) style.paddingLeft = p.left;
  }
  if (attrs.margin) {
    const m = attrs.margin as Record<string, string>;
    if (m.top) style.marginTop = m.top;
    if (m.right) style.marginRight = m.right;
    if (m.bottom) style.marginBottom = m.bottom;
    if (m.left) style.marginLeft = m.left;
  }
  if (attrs.borderColor) {
    style.borderColor = attrs.borderColor as string;
  }
  if (attrs.borderWidth) {
    style.borderWidth = attrs.borderWidth as string;
  }
  if (attrs.shadow) {
    style.boxShadow = attrs.shadow as string;
  }

  return style;
}

export function getAlignmentClass(alignment: string): string {
  const map: Record<string, string> = {
    left: "align-left",
    center: "align-center",
    right: "align-right",
    wide: "align-wide",
    full: "align-full",
  };
  return map[alignment] ?? "";
}
