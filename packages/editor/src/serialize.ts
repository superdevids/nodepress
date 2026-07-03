/**
 * Serialize ProseMirror JSON content to HTML.
 */

import type { BlockNode } from "./types.js";

/**
 * Serialize a ProseMirror document (JSON) to HTML string.
 */
export function serializeToHtml(doc: { type: string; content?: BlockNode[] }): string {
  if (!doc?.content) return "";
  return doc.content.map(serializeNode).join("\n");
}

function serializeNode(node: BlockNode): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${serializeInline(node)}</p>`;
    case "heading":
      const level = (node.attrs?.level as number) ?? 2;
      return `<h${level}>${serializeInline(node)}</h${level}>`;
    case "bulletList":
      return `<ul>${node.content?.map(serializeNode).join("") ?? ""}</ul>`;
    case "orderedList":
      return `<ol>${node.content?.map(serializeNode).join("") ?? ""}</ol>`;
    case "listItem":
      return `<li>${serializeInline(node)}</li>`;
    case "blockquote":
      return `<blockquote>${serializeInline(node)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${node.text ?? ""}</code></pre>`;
    case "image":
      return `<img src="${node.attrs?.src ?? ""}" alt="${node.attrs?.alt ?? ""}" />`;
    case "horizontalRule":
      return "<hr />";
    case "hardBreak":
      return "<br />";
    default:
      return serializeInline(node);
  }
}

function serializeInline(node: BlockNode): string {
  let text = node.text ?? "";

  // Apply marks
  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          text = `<strong>${text}</strong>`;
          break;
        case "italic":
          text = `<em>${text}</em>`;
          break;
        case "underline":
          text = `<u>${text}</u>`;
          break;
        case "strike":
          text = `<s>${text}</s>`;
          break;
        case "code":
          text = `<code>${text}</code>`;
          break;
        case "link":
          text = `<a href="${mark.attrs?.href ?? ""}">${text}</a>`;
          break;
      }
    }
  }

  // Recurse into children
  if (node.content) {
    text = node.content.map(serializeInline).join("");
  }

  return text;
}
