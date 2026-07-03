/**
 * Register all core blocks with the block registry.
 */

import { blockRegistry } from "../block-api.js";
import type { BlockDeclaration } from "../types.js";

function registerBlock(decl: BlockDeclaration): void {
  blockRegistry.registerBlock(decl);
}

registerBlock({
  name: "core/paragraph",
  title: "Paragraph",
  icon: "text",
  category: "text",
  description: "Start with simple text.",
  keywords: ["text", "paragraph", "body"],
  supports: {
    align: ["left", "center", "right"],
    anchor: true,
    customClassName: true,
    html: true,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true, fontFamily: true },
    spacing: { padding: true, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/heading",
  title: "Heading",
  icon: "heading",
  category: "text",
  description: "Section heading.",
  keywords: ["heading", "title", "h1", "h2", "h3"],
  supports: {
    align: ["left", "center", "right"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true, fontFamily: true },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/image",
  title: "Image",
  icon: "image",
  category: "media",
  description: "Insert an image.",
  keywords: ["image", "photo", "picture", "media"],
  supports: {
    align: ["left", "center", "right", "wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: true,
    shadow: true,
  },
});

registerBlock({
  name: "core/gallery",
  title: "Gallery",
  icon: "image",
  category: "media",
  description: "Display multiple images in a gallery.",
  keywords: ["gallery", "images", "photos"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/video",
  title: "Video",
  icon: "video",
  category: "media",
  description: "Embed a video from your media library or URL.",
  keywords: ["video", "embed", "media"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/embed",
  title: "Embed",
  icon: "code",
  category: "embeds",
  description: "Embed videos, tweets, and other content from external sources.",
  keywords: ["embed", "youtube", "twitter", "vimeo", "video"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/quote",
  title: "Quote",
  icon: "quote",
  category: "text",
  description: "Pull a quote from another source.",
  keywords: ["quote", "blockquote", "citation"],
  supports: {
    align: ["left", "center", "right", "wide"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: true, margin: true },
    border: true,
    shadow: false,
  },
});

registerBlock({
  name: "core/list",
  title: "List",
  icon: "list",
  category: "text",
  description: "Create a bulleted or numbered list.",
  keywords: ["list", "bullet", "ordered", "ul", "ol"],
  supports: {
    align: ["left", "center", "right"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/code",
  title: "Code",
  icon: "code",
  category: "text",
  description: "Display code snippets.",
  keywords: ["code", "pre", "snippet", "programming"],
  supports: {
    align: false,
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true, fontFamily: true },
    spacing: { padding: true, margin: true },
    border: true,
    shadow: false,
  },
});

registerBlock({
  name: "core/table",
  title: "Table",
  icon: "table",
  category: "text",
  description: "Insert a table for structured data.",
  keywords: ["table", "data", "grid"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: true, margin: true },
    border: true,
    shadow: false,
  },
});

registerBlock({
  name: "core/button",
  title: "Button",
  icon: "button",
  category: "design",
  description: "A single button with link.",
  keywords: ["button", "link", "cta"],
  supports: {
    align: ["left", "center", "right"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: true, margin: true },
    border: true,
    shadow: true,
  },
});

registerBlock({
  name: "nodepress/cover",
  title: "Cover",
  icon: "cover",
  category: "media",
  description: "Full-width background image or video with overlay text.",
  keywords: ["cover", "hero", "background", "banner"],
  supports: {
    align: ["full", "wide"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: true },
    typography: { fontSize: true, lineHeight: true, fontFamily: true },
    spacing: { padding: true, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "nodepress/media-text",
  title: "Media & Text",
  icon: "media",
  category: "media",
  description: "Show media and text side by side.",
  keywords: ["media", "text", "image", "side-by-side"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: true, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "nodepress/buttons",
  title: "Buttons",
  icon: "button",
  category: "design",
  description: "One or more buttons with various styles.",
  keywords: ["button", "buttons", "cta", "link"],
  supports: {
    align: ["left", "center", "right"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "nodepress/columns",
  title: "Columns",
  icon: "columns",
  category: "design",
  description: "Arrange content in multiple columns.",
  keywords: ["columns", "grid", "layout", "multicolumn"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: true, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "nodepress/spacer",
  title: "Spacer",
  icon: "spacer",
  category: "design",
  description: "Add whitespace between blocks.",
  keywords: ["spacer", "space", "gap", "whitespace"],
  supports: {
    align: false,
    anchor: false,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: false },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "core/separator",
  title: "Separator",
  icon: "separator",
  category: "design",
  description: "A visual divider between blocks.",
  keywords: ["separator", "hr", "divider", "line"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: false, text: false, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: false, margin: true },
    border: false,
    shadow: false,
  },
});

registerBlock({
  name: "nodepress/details",
  title: "Details",
  icon: "details",
  category: "text",
  description: "Collapsible content block.",
  keywords: ["details", "summary", "collapse", "accordion"],
  supports: {
    align: false,
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: true, lineHeight: true },
    spacing: { padding: true, margin: true },
    border: true,
    shadow: false,
  },
});

registerBlock({
  name: "core/columns",
  title: "Columns (Legacy)",
  icon: "columns",
  category: "design",
  description: "Add columns to organize content.",
  keywords: ["columns", "column", "layout"],
  supports: {
    align: ["wide", "full"],
    anchor: true,
    customClassName: true,
    html: false,
    multiple: true,
    reusable: true,
    color: { background: true, text: true, gradients: false },
    typography: { fontSize: false, lineHeight: false },
    spacing: { padding: true, margin: true },
    border: false,
    shadow: false,
  },
});