/**
 * Reusable Blocks / Synced Patterns (Gap E-07)
 *
 * Save block groups as reusable blocks that can be synced across the site.
 * When synced=true, changes in one place update all instances.
 */

import { blockRegistry } from "../block-api.js";
import type { ReusableBlockData, BlockNode } from "../types.js";

export type { ReusableBlockData } from "../types.js";

export interface ReusableBlockStore {
  getAll(): Promise<ReusableBlockData[]>;
  getById(id: string): Promise<ReusableBlockData | undefined>;
  save(data: ReusableBlockData): Promise<void>;
  remove(id: string): Promise<void>;
  update(data: Partial<ReusableBlockData> & { id: string }): Promise<void>;
}

export function registerReusableBlock(data: ReusableBlockData): void {
  blockRegistry.registerReusableBlock(data);
}

export function getReusableBlock(id: string): ReusableBlockData | undefined {
  return blockRegistry.getReusableBlock(id);
}

export function getReusableBlocks(): ReusableBlockData[] {
  return blockRegistry.getReusableBlocks();
}

export function removeReusableBlock(id: string): void {
  blockRegistry.removeReusableBlock(id);
}

export function createReusableBlockRef(id: string, synced: boolean = true): BlockNode {
  return {
    type: "nodepress/reusable-block",
    attrs: { id, synced },
  };
}

export function isReusableBlock(node: BlockNode): boolean {
  return node.type === "nodepress/reusable-block";
}

export function getReusableBlockRefId(node: BlockNode): string | undefined {
  if (!isReusableBlock(node)) return undefined;
  return node.attrs?.id as string | undefined;
}

export function expandReusableBlock(data: ReusableBlockData): BlockNode[] {
  return data.content;
}

let store: ReusableBlockStore | null = null;

export function setReusableBlockStore(s: ReusableBlockStore): void {
  store = s;
}

export function getReusableBlockStore(): ReusableBlockStore | null {
  return store;
}

export async function fetchReusableBlocks(): Promise<ReusableBlockData[]> {
  if (store) return store.getAll();
  return getReusableBlocks();
}

export async function saveReusableBlock(data: ReusableBlockData): Promise<void> {
  registerReusableBlock(data);
  if (store) await store.save(data);
}

export async function deleteReusableBlock(id: string): Promise<void> {
  removeReusableBlock(id);
  if (store) await store.remove(id);
}

export async function updateReusableBlock(data: Partial<ReusableBlockData> & { id: string }): Promise<void> {
  const existing = getReusableBlock(data.id);
  if (existing) {
    const updated: ReusableBlockData = { ...existing, ...data };
    registerReusableBlock(updated);
    if (store) await store.update(data);
  }
}