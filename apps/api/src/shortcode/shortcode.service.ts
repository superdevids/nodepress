import { Injectable, Logger } from '@nestjs/common';

export type ShortcodeHandler = (attrs: Record<string, string>, content?: string) => string;

/**
 * Shortcode service — Gap A-01
 *
 * Registers and renders shortcodes (e.g. [gallery id="123"])
 * embedded within content. Analogous to WordPress shortcodes.
 */
@Injectable()
export class ShortcodeService {
  private readonly logger = new Logger(ShortcodeService.name);
  private readonly registry = new Map<string, ShortcodeHandler>();

  constructor() {
    // Register built-in shortcodes
    this.register('gallery', this.galleryHandler.bind(this));
    this.register('audio', this.audioHandler.bind(this));
    this.register('video', this.videoHandler.bind(this));
    this.register('embed', this.embedHandler.bind(this));
  }

  /** Register a new shortcode tag. */
  register(tag: string, handler: ShortcodeHandler): void {
    if (this.registry.has(tag)) {
      this.logger.warn(`Shortcode "${tag}" already registered — overwriting`);
    }
    this.registry.set(tag, handler);
    this.logger.log(`Shortcode registered: [${tag}]`);
  }

  /** Unregister a shortcode tag. */
  unregister(tag: string): void {
    this.registry.delete(tag);
  }

  /** Check if a shortcode is registered. */
  has(tag: string): boolean {
    return this.registry.has(tag);
  }

  /**
   * Parse and render all shortcodes in a block of content.
   *
   * Supports self-closing: [tag key="val"]
   * And wrapping:         [tag]content[/tag]
   */
  render(input: string): string {
    const shortcodeRegex = /\[(\w+)([^\]]*?)\](?:(.*?)\[\/\1\])?/gs;

    return input.replace(shortcodeRegex, (match, tag: string, attrsStr: string, content?: string) => {
      const handler = this.registry.get(tag);
      if (!handler) return match; // leave unregistered shortcodes as-is

      const attrs = this.parseAttributes(attrsStr.trim());
      try {
        return handler(attrs, content?.trim());
      } catch (err) {
        this.logger.error(`Shortcode [${tag}] render error: ${(err as Error).message}`);
        return match;
      }
    });
  }

  // ---- built-in handlers ----

  private galleryHandler(attrs: Record<string, string>): string {
    const ids = attrs['ids'] ?? attrs['id'] ?? '';
    const columns = attrs['columns'] ?? '3';
    return `<div class="gallery gallery-columns-${columns}" data-ids="${ids}"><!-- gallery placeholder --></div>`;
  }

  private audioHandler(attrs: Record<string, string>): string {
    const src = attrs['src'] ?? '';
    return `<audio controls src="${this.escape(src)}"></audio>`;
  }

  private videoHandler(attrs: Record<string, string>): string {
    const src = attrs['src'] ?? '';
    return `<video controls src="${this.escape(src)}"></video>`;
  }

  private embedHandler(attrs: Record<string, string>, content?: string): string {
    const url = attrs['url'] ?? content ?? '';
    return `<div class="embed-container"><!-- oEmbed placeholder: ${this.escape(url)} --></div>`;
  }

  // ---- helpers ----

  private parseAttributes(input: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(input)) !== null) {
      attrs[match[1]] = match[2];
    }

    return attrs;
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
