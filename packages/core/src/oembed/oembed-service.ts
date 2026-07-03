import { OEmbedRegistry, type OEmbedProviderConfig, type OEmbedResult } from "./oembed-registry.js";
import { OEmbedResolver } from "./oembed-resolver.js";
import { OEmbedProxy } from "./oembed-proxy.js";
import type { CacheService } from "../cache/cache-service.js";

export type { OEmbedProviderConfig, OEmbedResult };
export { OEmbedRegistry } from "./oembed-registry.js";
export { OEmbedResolver } from "./oembed-resolver.js";
export { OEmbedProxy } from "./oembed-proxy.js";

export class OEmbedService {
  public readonly registry: OEmbedRegistry;
  public readonly resolver: OEmbedResolver;
  public readonly proxy: OEmbedProxy;

  constructor(cache?: CacheService) {
    this.registry = new OEmbedRegistry();
    this.registry.registerBuiltinProviders();
    this.resolver = new OEmbedResolver(this.registry, cache);
    this.proxy = new OEmbedProxy(this.resolver);
  }

  registerProvider(provider: OEmbedProviderConfig): void {
    this.registry.registerProvider(provider);
  }

  getProviders(): OEmbedProviderConfig[] {
    return this.registry.getAllProviders();
  }

  detectProvider(url: string): OEmbedProviderConfig | null {
    return this.registry.detectProvider(url);
  }

  async fetch(url: string): Promise<OEmbedResult | null> {
    return this.resolver.resolve(url);
  }

  async autoEmbed(content: string): Promise<string> {
    if (!content) return content;
    const urlPattern = /(?:<p>)?(https?:\/\/[^\s<>]+)(?:<\/p>)?/g;
    const matches = Array.from(content.matchAll(urlPattern));
    let result = content;

    for (const match of matches) {
      const fullMatch = match[0]!;
      const url = match[1]!;
      const provider = this.detectProvider(url);
      if (!provider) continue;
      const embed = await this.fetch(url);
      if (embed?.html) {
        const wrapped = `<figure class="wp-block-embed is-type-${embed.type}">${embed.html}</figure>`;
        result = result.replace(fullMatch, wrapped);
      }
    }

    return result;
  }

  clearCache(): void {
    // Cache clearing is handled by the CacheService
  }
}
