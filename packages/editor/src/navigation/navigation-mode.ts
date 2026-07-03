/**
 * Navigation Mode (Gap E-10)
 *
 * Keyboard-based navigation (arrow keys to select parent/child blocks),
 * list view sidebar showing all blocks as a tree, and breadcrumbs in the toolbar.
 */

import type { BlockNode } from "../types.js";

export interface BlockTreeNode {
  id: string;
  name: string;
  title: string;
  depth: number;
  children: BlockTreeNode[];
  node: BlockNode;
  pos: number;
}

let _blockIdCounter = 0;

export function buildBlockTree(nodes: BlockNode[], parentDepth: number = 0): BlockTreeNode[] {
  const tree: BlockTreeNode[] = [];

  for (const node of nodes) {
    const id = `block-${_blockIdCounter++}`;
    const children = node.content ? buildBlockTree(node.content, parentDepth + 1) : [];
    const pos = _blockIdCounter - 1;
    tree.push({
      id,
      name: node.type,
      title: getBlockTitle(node),
      depth: parentDepth,
      children,
      node,
      pos,
    });
  }

  return tree;
}

export function findBlockById(tree: BlockTreeNode[], id: string): BlockTreeNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findBlockById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function getBlockTitle(node: BlockNode): string {
  const typeMap: Record<string, string> = {
    doc: "Document",
    paragraph: "Paragraph",
    heading: "Heading",
    bulletList: "List",
    orderedList: "Ordered List",
    listItem: "List Item",
    blockquote: "Quote",
    codeBlock: "Code",
    image: "Image",
    horizontalRule: "Separator",
    hardBreak: "Line Break",
    table: "Table",
    tableRow: "Table Row",
    tableCell: "Table Cell",
    tableHeader: "Table Header",
    youtube: "YouTube",
    "nodepress/cover": "Cover",
    "nodepress/media-text": "Media & Text",
    "nodepress/buttons": "Buttons",
    "nodepress/columns": "Columns",
    "nodepress/spacer": "Spacer",
    "nodepress/details": "Details",
    "nodepress/reusable-block": "Reusable Block",
  };

  return typeMap[node.type] ?? node.type;
}

export function getParentBlockId(tree: BlockTreeNode[], currentId: string): string | undefined {
  for (const node of tree) {
    if (node.children.some((c) => c.id === currentId)) return node.id;
    if (node.children.length > 0) {
      const found = getParentBlockId(node.children, currentId);
      if (found) return found;
    }
  }
  return undefined;
}

export function getPreviousSibling(tree: BlockTreeNode[], currentId: string): BlockTreeNode | undefined {
  const topIdx = tree.findIndex((c) => c.id === currentId);
  if (topIdx > 0) return tree[topIdx - 1];
  for (const node of tree) {
    const idx = node.children.findIndex((c) => c.id === currentId);
    if (idx > 0) return node.children[idx - 1];
    if (node.children.length > 0) {
      const found = getPreviousSibling(node.children, currentId);
      if (found) return found;
    }
  }
  return undefined;
}

export function getNextSibling(tree: BlockTreeNode[], currentId: string): BlockTreeNode | undefined {
  const topIdx = tree.findIndex((c) => c.id === currentId);
  if (topIdx >= 0 && topIdx < tree.length - 1) return tree[topIdx + 1];
  for (const node of tree) {
    const idx = node.children.findIndex((c) => c.id === currentId);
    if (idx >= 0 && idx < node.children.length - 1) return node.children[idx + 1];
    if (node.children.length > 0) {
      const found = getNextSibling(node.children, currentId);
      if (found) return found;
    }
  }
  return undefined;
}

export function flattenTree(tree: BlockTreeNode[]): BlockTreeNode[] {
  const result: BlockTreeNode[] = [];
  for (const node of tree) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export function buildBreadcrumbs(tree: BlockTreeNode[], currentId: string): { id: string; title: string }[] {
  const crumbs: { id: string; title: string }[] = [];
  let current = findBlockById(tree, currentId);
  if (!current) return crumbs;

  crumbs.unshift({ id: current.id, title: current.title });

  while (current) {
    const parentId = getParentBlockId(tree, current.id);
    if (!parentId) break;
    const parent = findBlockById(tree, parentId);
    if (!parent) break;
    crumbs.unshift({ id: parent.id, title: parent.title });
    current = parent;
  }

  return crumbs;
}