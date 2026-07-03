/**
 * Parse HTML string to ProseMirror-compatible JSON structure.
 * Uses DOMParser for proper HTML parsing with inline mark support.
 */

import type { BlockNode } from "./types.js";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * Parse an HTML string to a ProseMirror document structure.
 */
export function parseFromHtml(html: string): { type: "doc"; content: BlockNode[] } {
  if (!html) {
    return { type: "doc", content: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: BlockNode[] = [];

  for (const child of doc.body.childNodes) {
    const block = parseBlockNode(child);
    if (block) blocks.push(block);
  }

  if (blocks.length === 0 && doc.body.textContent?.trim()) {
    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text: doc.body.textContent.trim() }],
    });
  }

  return { type: "doc", content: blocks };
}

function parseBlockNode(node: Node): BlockNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return { type: "paragraph", content: [{ type: "text", text }] };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "p":
      return { type: "paragraph", content: parseInlineChildren(el.childNodes) };
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      return { type: "heading", attrs: { level: parseInt(tag[1], 10) }, content: parseInlineChildren(el.childNodes) };
    case "ul":
      return { type: "bulletList", content: parseListItems(el) };
    case "ol":
      return { type: "orderedList", content: parseListItems(el) };
    case "li":
      return { type: "listItem", content: parseInlineChildren(el.childNodes) };
    case "blockquote":
      return { type: "blockquote", content: parseInlineChildren(el.childNodes) };
    case "pre":
      return { type: "codeBlock", content: [{ type: "text", text: el.textContent || "" }] };
    case "hr":
      return { type: "horizontalRule" };
    case "br":
      return { type: "hardBreak" };
    case "div":
      return parseBlockChildren(el);
    default:
      return { type: "paragraph", content: parseInlineChildren(el.childNodes) };
  }
}

function parseBlockChildren(parent: HTMLElement): BlockNode | null {
  const blocks: BlockNode[] = [];
  for (const child of parent.childNodes) {
    const block = parseBlockNode(child);
    if (block) blocks.push(block);
  }
  return blocks.length > 0 ? { type: "paragraph", content: blocks.flatMap(b => b.content || []) } : null;
}

function parseListItems(el: HTMLElement): BlockNode[] {
  const items: BlockNode[] = [];
  for (const child of el.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const li = child as HTMLElement;
      if (li.tagName.toLowerCase() === "li") {
        items.push({ type: "listItem", content: parseInlineChildren(li.childNodes) });
      }
    }
  }
  return items;
}

function parseInlineChildren(nodes: NodeList): BlockNode[] {
  const result: BlockNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) result.push({ type: "text", text });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const marks = parseMarks(tag, el);
      const innerContent = parseInlineChildren(el.childNodes);

      if (marks.length > 0) {
        for (const inner of innerContent) {
          if (inner.type === "text") {
            const existingMarks = (inner as { marks?: Mark[] }).marks || [];
            result.push({
              type: "text",
              marks: [...marks, ...existingMarks],
              text: inner.text,
            } as BlockNode);
          } else {
            result.push(inner);
          }
        }
      } else if (tag === "br") {
        result.push({ type: "hardBreak" });
      } else {
        result.push(...innerContent);
      }
    }
  }
  return result;
}

function parseMarks(tag: string, el: HTMLElement): Mark[] {
  switch (tag) {
    case "strong": case "b":
      return [{ type: "bold" }];
    case "em": case "i":
      return [{ type: "italic" }];
    case "u":
      return [{ type: "underline" }];
    case "s": case "strike": case "del":
      return [{ type: "strike" }];
    case "code":
      return [{ type: "code" }];
    case "a":
      return [{ type: "link", attrs: { href: (el as HTMLAnchorElement).href || "" } }];
    case "sub":
      return [{ type: "subscript" }];
    case "sup":
      return [{ type: "superscript" }];
    default:
      return [];
  }
}
