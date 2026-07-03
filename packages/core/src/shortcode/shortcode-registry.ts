export type ShortcodeHandler = (attrs: Record<string, string>, content?: string) => string | Promise<string>;

export interface ShortcodeDefinition {
  tag: string;
  handler: ShortcodeHandler;
  description?: string;
}

export class ShortcodeRegistry {
  private shortcodes: Map<string, ShortcodeDefinition> = new Map();

  registerShortcode(tag: string, handler: ShortcodeHandler, description?: string): void {
    if (this.shortcodes.has(tag)) {
      throw new Error(`Shortcode "[${tag}]" is already registered.`);
    }
    this.shortcodes.set(tag, { tag, handler, description });
  }

  unregisterShortcode(tag: string): void {
    this.shortcodes.delete(tag);
  }

  getShortcode(tag: string): ShortcodeDefinition | undefined {
    return this.shortcodes.get(tag);
  }

  getAllShortcodes(): ShortcodeDefinition[] {
    return Array.from(this.shortcodes.values());
  }

  hasShortcode(tag: string): boolean {
    return this.shortcodes.has(tag);
  }

  clear(): void {
    this.shortcodes.clear();
  }
}
