/**
 * Block Locking (Gap E-09)
 *
 * Lock blocks per-block via sidebar settings. Supports three lock types:
 * move, remove, and edit. Entire templates can be locked.
 */

import type { BlockLock, BlockNode } from "../types.js";

export type { BlockLock } from "../types.js";

export function createBlockLock(overrides?: Partial<BlockLock>): BlockLock {
  return {
    move: overrides?.move ?? false,
    remove: overrides?.remove ?? false,
    edit: overrides?.edit ?? false,
  };
}

export function isBlockLocked(node: BlockNode, lockType: keyof BlockLock): boolean {
  const lock = node.attrs?.lock as BlockLock | undefined;
  if (!lock) return false;
  return lock[lockType] === true;
}

export function canMoveBlock(node: BlockNode): boolean {
  return !isBlockLocked(node, "move");
}

export function canRemoveBlock(node: BlockNode): boolean {
  return !isBlockLocked(node, "remove");
}

export function canEditBlock(node: BlockNode): boolean {
  return !isBlockLocked(node, "edit");
}

export function applyBlockLock(node: BlockNode, lock: BlockLock): BlockNode {
  return {
    ...node,
    attrs: {
      ...node.attrs,
      lock,
    },
  };
}

export function mergeBlockLock(existing: BlockLock, overrides: Partial<BlockLock>): BlockLock {
  return {
    move: overrides.move ?? existing.move,
    remove: overrides.remove ?? existing.remove,
    edit: overrides.edit ?? existing.edit,
  };
}

export function lockEntireContent(nodes: BlockNode[]): BlockNode[] {
  return nodes.map((node) => applyBlockLock(node, createBlockLock({ move: true, remove: true, edit: true })));
}

export function isTemplateLocked(nodes: BlockNode[]): boolean {
  if (nodes.length === 0) return false;
  return nodes.every((node) => isBlockLocked(node, "edit"));
}

export function getUnlockedBlocks(nodes: BlockNode[]): BlockNode[] {
  return nodes.filter((node) => canEditBlock(node));
}