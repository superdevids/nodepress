import { ShortcodeRegistry, type ShortcodeHandler } from "./shortcode-registry.js";
import { processContent, stripShortcodes } from "./shortcode-processor.js";

export type { ShortcodeHandler } from "./shortcode-registry.js";
export { ShortcodeRegistry } from "./shortcode-registry.js";
export { processContent, doShortcode, stripShortcodes } from "./shortcode-processor.js";

export class ShortcodeEngine {
  public readonly registry: ShortcodeRegistry;

  constructor() {
    this.registry = new ShortcodeRegistry();
    this.registerBuiltinShortcodes();
  }

  register(tag: string, handler: ShortcodeHandler, description?: string): void {
    this.registry.registerShortcode(tag, handler, description);
  }

  unregister(tag: string): void {
    this.registry.unregisterShortcode(tag);
  }

  has(tag: string): boolean {
    return this.registry.hasShortcode(tag);
  }

  async parse(content: string): Promise<string> {
    return processContent(this.registry, content);
  }

  strip(content: string): string {
    return stripShortcodes(content);
  }

  getAll() {
    return this.registry.getAllShortcodes();
  }

  private registerBuiltinShortcodes(): void {
    this.register("gallery", async (attrs) => {
      const ids = attrs["ids"]?.split(",").map(Number).filter(Boolean) ?? [];
      const columns = parseInt(attrs["columns"] ?? "3", 10);
      const size = attrs["size"] ?? "thumbnail";
      const link = attrs["link"] ?? "attachment";
      const items = ids.map((id) => {
        const img = `<img src="/api/media/${id}" alt="" class="gallery-image" data-id="${id}" />`;
        if (link === "file") return `<a href="/api/media/${id}/file">${img}</a>`;
        return img;
      }).join("");
      return `<div class="wp-block-gallery columns-${columns} size-${size}">${items}</div>`;
    }, "Display a gallery of images.");

    this.register("audio", async (attrs) => {
      const src = attrs["src"] ?? "";
      const loop = attrs["loop"] === "true" ? " loop" : "";
      const autoplay = attrs["autoplay"] === "true" ? " autoplay" : "";
      const preload = attrs["preload"] ?? "none";
      return `<audio controls${loop}${autoplay} preload="${preload}" src="${src}"></audio>`;
    }, "Embed an audio file.");

    this.register("video", async (attrs) => {
      const src = attrs["src"] ?? "";
      const poster = attrs["poster"] ?? "";
      const width = attrs["width"] ?? "";
      const height = attrs["height"] ?? "";
      const loop = attrs["loop"] === "true" ? " loop" : "";
      const autoplay = attrs["autoplay"] === "true" ? " autoplay" : "";
      const dims = [width ? `width="${width}"` : "", height ? `height="${height}"` : ""].filter(Boolean).join(" ");
      return `<video controls${loop}${autoplay}${poster ? ` poster="${poster}"` : ""} ${dims} src="${src}"></video>`;
    }, "Embed a video file.");

    this.register("embed", async (attrs, content) => {
      const url = attrs["url"] ?? content ?? "";
      return `<div class="wp-block-embed"><div class="wp-block-embed__wrapper">${url}</div></div>`;
    }, "Embed external content.");

    this.register("caption", async (attrs, content) => {
      const caption = attrs["caption"] ?? attrs["c"] ?? "";
      const align = attrs["align"] ?? "none";
      const width = attrs["width"] ?? "";
      const style = width ? ` style="width:${typeof width === "string" && width.endsWith("px") ? width : width + "px"}"` : "";
      return `<figure class="wp-block-image align${align}"${style}>${content ?? ""}<figcaption class="wp-caption-text">${caption}</figcaption></figure>`;
    }, "Wrap content with a caption.");

    this.register("playlist", async (attrs) => {
      const ids = attrs["ids"]?.split(",").map(Number).filter(Boolean) ?? [];
      const type = attrs["type"] ?? "audio";
      const items = ids.map((id) =>
        `<li class="wp-playlist-item" data-id="${id}"><span class="wp-playlist-item-title">Media #${id}</span></li>`
      ).join("");
      return `<div class="wp-playlist wp-${type}-playlist"><ol class="wp-playlist-items">${items}</ol></div>`;
    }, "Display a playlist of audio or video items.");
  }
}

export function registerShortcode(tag: string, handler: ShortcodeHandler, description?: string): ShortcodeEngine {
  const engine = new ShortcodeEngine();
  engine.register(tag, handler, description);
  return engine;
}
