import { blockRegistry } from "../block-api.js";
import type { BlockTransformDef, BlockNode } from "../types.js";

export type { BlockTransformDef } from "../types.js";

export function registerBlockTransform(
  from: string,
  to: string,
  transform: BlockTransformDef["transform"],
): void {
  blockRegistry.registerBlockTransform(from, to, transform);
}

export function getBlockTransforms(from: string): BlockTransformDef[] {
  return blockRegistry.getBlockTransforms(from);
}

export function getBlockTransformsFor(from: string): BlockTransformDef[] {
  return blockRegistry.getBlockTransforms(from);
}

registerBlockTransform("core/heading", "core/paragraph", (_attrs, content) => ({
  attrs: {},
  content,
}));

registerBlockTransform("core/paragraph", "core/heading", (_attrs, content) => ({
  attrs: { level: 2 },
  content,
}));

registerBlockTransform("core/list", "core/paragraph", (_attrs, content) => {
  const text: BlockNode = { type: "text", text: content?.map(extractText).join(", ") ?? "" };
  return { attrs: {}, content: [text] };
});

registerBlockTransform("core/paragraph", "core/list", (_attrs, content) => ({
  attrs: { ordered: false },
  content: content?.map((n) => ({ type: "listItem", content: [n] })) ?? [],
}));

registerBlockTransform("core/paragraph", "core/quote", (_attrs, content) => ({
  attrs: {},
  content: [{ type: "paragraph", content }],
}));

registerBlockTransform("core/quote", "core/paragraph", (_attrs, content) => {
  const inner = content?.[0]?.content ?? content;
  return { attrs: {}, content: inner ?? [] };
});

registerBlockTransform("core/image", "core/gallery", (attrs, content) => ({
  attrs: { images: [attrs] },
  content,
}));

registerBlockTransform("core/gallery", "core/image", (attrs, content) => ({
  attrs: (attrs as { images?: Record<string, unknown>[] }).images?.[0] ?? {},
  content,
}));

registerBlockTransform("core/code", "core/paragraph", (_attrs, content) => {
  const text: BlockNode = {
    type: "text",
    text: content?.map((n) => n.text ?? "").join("\n") ?? "",
  };
  return { attrs: {}, content: [text] };
});

registerBlockTransform("core/paragraph", "core/code", (_attrs, content) => ({
  attrs: {},
  content: content?.map((n) => ({ type: "text", text: n.text ?? "" })) ?? [],
}));

function extractText(node: BlockNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join(" ");
  return "";
}