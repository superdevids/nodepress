/**
 * Utility functions for the block editor.
 */

import type { BlockNode } from "../types.js";

export function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + "...";
}

export function getTextFromBlock(node: BlockNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(getTextFromBlock).join(" ");
  return "";
}

export function isEmptyBlock(node: BlockNode): boolean {
  if (node.type === "horizontalRule" || node.type === "hardBreak") return false;
  if (!node.content && !node.text) return true;
  if (node.text === "") return true;
  if (node.content && node.content.every(isEmptyBlock)) return true;
  return false;
}

export function calculateBlockLevel(node: BlockNode): number {
  const typeMap: Record<string, number> = {
    heading: 1,
    paragraph: 2,
    bulletList: 2,
    orderedList: 2,
    listItem: 3,
    blockquote: 2,
    codeBlock: 2,
    image: 2,
    table: 2,
    "nodepress/cover": 1,
    "nodepress/columns": 1,
    "nodepress/media-text": 2,
    "nodepress/buttons": 2,
  };
  return typeMap[node.type] ?? 2;
}

export function getBlockTypeForMenuOrder(type: string): number {
  const order: Record<string, number> = {
    "nodepress/cover": 0,
    "nodepress/columns": 1,
    "nodepress/media-text": 2,
    heading: 3,
    paragraph: 4,
    bulletList: 5,
    orderedList: 6,
    blockquote: 7,
    image: 8,
    "nodepress/buttons": 9,
    table: 10,
    "nodepress/spacer": 11,
    horizontalRule: 12,
    codeBlock: 13,
    "nodepress/details": 14,
  };
  return order[type] ?? 99;
}