import type { OEmbedRegistry, OEmbedResult } from "./oembed-registry.js";
import type { CacheService } from "../cache/cache-service.js";

const ALLOWED_HTML_TAGS = new Set([
  "div", "span", "p", "br", "a", "img",
  "iframe", "video", "audio", "source",
  "blockquote", "cite", "q",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption",
  "b", "i", "em", "strong", "u", "s", "sub", "sup",
  "pre", "code", "small",
]);

const ALLOWED_HTML_ATTRS = new Set([
  "src", "href", "width", "height", "frameborder", "allowfullscreen",
  "allow", "style", "class", "id", "name", "title", "alt",
  "type", "controls", "autoplay", "loop", "muted", "poster",
  "scrolling", "sandbox", "target", "rel",
]);

const UNSAFE_URL_SCHEMES = /^(javascript|data|vbscript):/i;

function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<(\/?)(\w+)([^>]*)>/g, (match, close, tag, attrs) => {
    const tagName = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tagName)) return escapeHtmlEntities(match);

    const cleanedAttrs: string[] = [];
    const attrRe = /(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(attrs)) !== null) {
      const attrName = attrMatch[1]!.trim().toLowerCase();
      if (!attrName) continue;
      if (!ALLOWED_HTML_ATTRS.has(attrName)) continue;
      if (attrName.startsWith("on")) continue;

      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4];
      if (value !== undefined) {
        if ((attrName === "href" || attrName === "src") && UNSAFE_URL_SCHEMES.test(value)) {
          continue;
        }
        const delim = attrMatch[2] !== undefined ? '"' : attrMatch[3] !== undefined ? "'" : "";
        cleanedAttrs.push(`${attrName}=${delim}${value}${delim}`);
      } else {
        cleanedAttrs.push(attrName);
      }
    }

    const attrStr = cleanedAttrs.length > 0 ? ` ${cleanedAttrs.join(" ")}` : "";
    return `<${close}${tagName}${attrStr}>`;
  });
}

function escapeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function discoverOEmbedEndpoint(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "NodePress oEmbed Discovery/1.0" },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const linkRe = /<link[^>]*type=["']?application\/json\+oembed["']?[^>]*href=["']([^"']+)["'][^>]*\/?>/i;
    const match = linkRe.exec(html);
    if (match?.[1]) return match[1];
    const altRe = /<link[^>]*href=["']([^"']+)["'][^>]*type=["']?application\/json\+oembed["']?[^>]*\/?>/i;
    const altMatch = altRe.exec(html);
    return altMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export class OEmbedResolver {
  private registry: OEmbedRegistry;
  private cache: CacheService | null;

  constructor(registry: OEmbedRegistry, cache?: CacheService) {
    this.registry = registry;
    this.cache = cache ?? null;
  }

  setCache(cache: CacheService): void {
    this.cache = cache;
  }

  async resolve(url: string, maxWidth?: number, maxHeight?: number): Promise<OEmbedResult | null> {
    const cacheKey = `oembed:${url}:${maxWidth ?? ""}:${maxHeight ?? ""}`;

    if (this.cache) {
      const cached = await this.cache.get<OEmbedResult>(cacheKey);
      if (cached) return cached;
    }

    const provider = this.registry.detectProvider(url);
    if (!provider) {
      const discovered = await discoverOEmbedEndpoint(url);
      if (!discovered) return null;
      return this.fetchFromEndpoint(discovered, url, maxWidth, maxHeight, cacheKey);
    }

    return this.fetchFromEndpoint(provider.endpoint, url, maxWidth, maxHeight, cacheKey);
  }

  private async fetchFromEndpoint(
    endpoint: string,
    url: string,
    maxWidth?: number,
    maxHeight?: number,
    cacheKey?: string,
  ): Promise<OEmbedResult | null> {
    try {
      const apiUrl = new URL(endpoint);
      apiUrl.searchParams.set("url", url);
      apiUrl.searchParams.set("format", "json");
      if (maxWidth) apiUrl.searchParams.set("maxwidth", String(maxWidth));
      if (maxHeight) apiUrl.searchParams.set("maxheight", String(maxHeight));

      const response = await fetch(apiUrl.toString(), {
        headers: { "User-Agent": "NodePress oEmbed/1.0" },
      });
      if (!response.ok) return null;

      const data = await response.json() as Record<string, unknown>;
      const result: OEmbedResult = {
        type: (data.type ?? "link") as OEmbedResult["type"],
        title: data.title as string | undefined,
        authorName: data.author_name as string | undefined,
        authorUrl: data.author_url as string | undefined,
        providerName: data.provider_name as string | undefined,
        providerUrl: data.provider_url as string | undefined,
        html: data.html ? sanitizeHtml(data.html as string) : undefined,
        width: data.width ? Number(data.width) : undefined,
        height: data.height ? Number(data.height) : undefined,
        thumbnailUrl: data.thumbnail_url as string | undefined,
        thumbnailWidth: data.thumbnail_width ? Number(data.thumbnail_width) : undefined,
        thumbnailHeight: data.thumbnail_height ? Number(data.thumbnail_height) : undefined,
        url: data.url as string | undefined,
        cacheAge: data.cache_age ? Number(data.cache_age) : undefined,
      };

      if (this.cache && cacheKey) {
        const ttl = result.cacheAge ?? 86400;
        await this.cache.set(cacheKey, result, { ttl });
      }

      return result;
    } catch {
      return null;
    }
  }

  async resolveWithHtml(url: string, maxWidth?: number, maxHeight?: number): Promise<string | null> {
    const result = await this.resolve(url, maxWidth, maxHeight);
    if (!result?.html) return null;
    return wrapEmbed(result.html, result.width, result.height);
  }
}

function wrapEmbed(html: string, width?: number, height?: number): string {
  const style = [
    "max-width: 100%",
    width ? `width: ${width}px` : "",
    "margin: 0 auto",
  ].filter(Boolean).join("; ");
  const padding = width && height ? `padding-bottom: ${(height / width) * 100}%` : "";
  if (padding) {
    return `<div class="oembed-responsive" style="position: relative; overflow: hidden; ${padding}; height: 0;">${html}</div>`;
  }
  return `<div class="oembed-wrapper" style="${style}">${html}</div>`;
}
