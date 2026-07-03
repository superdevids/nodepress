/**
 * Serialization utilities for block content.
 */

import type { BlockNode, SerializedBlock } from "../types.js";

export function serializeBlock(node: BlockNode): SerializedBlock {
  const serialized: SerializedBlock = {
    type: node.type,
  };

  if (node.attrs && Object.keys(node.attrs).length > 0) {
    serialized.attrs = { ...node.attrs };
  }

  if (node.content && node.content.length > 0) {
    serialized.content = node.content.map(serializeBlock);
  }

  if (node.text) {
    serialized.text = node.text;
  }

  if (node.marks && node.marks.length > 0) {
    serialized.marks = node.marks.map((m) => ({ ...m }));
  }

  return serialized;
}

export function deserializeBlock(serialized: SerializedBlock): BlockNode {
  const node: BlockNode = {
    type: serialized.type,
  };

  if (serialized.attrs) {
    node.attrs = { ...serialized.attrs };
  }

  if (serialized.content) {
    node.content = serialized.content.map(deserializeBlock);
  }

  if (serialized.text !== undefined) {
    node.text = serialized.text;
  }

  if (serialized.marks) {
    node.marks = serialized.marks.map((m) => ({ ...m }));
  }

  return node;
}

export function serializeDocument(nodes: BlockNode[]): string {
  const doc: SerializedBlock = {
    type: "doc",
    content: nodes.map(serializeBlock),
  };
  return JSON.stringify(doc);
}

export function deserializeDocument(json: string): BlockNode[] {
  try {
    const doc: SerializedBlock = JSON.parse(json);
    if (doc.type === "doc" && doc.content) {
      return doc.content.map(deserializeBlock);
    }
    return [];
  } catch {
    return [];
  }
}

export function cloneBlock(node: BlockNode): BlockNode {
  return deserializeBlock(serializeBlock(node));
}

export function findBlocksByType(nodes: BlockNode[], type: string): BlockNode[] {
  const results: BlockNode[] = [];
  for (const node of nodes) {
    if (node.type === type) results.push(node);
    if (node.content) results.push(...findBlocksByType(node.content, type));
  }
  return results;
}

export function countBlocks(nodes: BlockNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.content) count += countBlocks(node.content);
  }
  return count;
}