import type { OEmbedResolver } from "./oembed-resolver.js";

const ALLOWED_HTML_TAGS = new Set([
  "div", "span", "p", "br", "a", "img",
  "iframe", "video", "audio", "source",
  "blockquote", "cite", "q",
  "figure", "figcaption",
  "b", "i", "em", "strong", "u", "s",
  "pre", "code", "small",
]);

const ALLOWED_HTML_ATTRS = new Set([
  "src", "href", "width", "height", "frameborder", "allowfullscreen",
  "allow", "style", "class", "id", "name", "title", "alt",
  "type", "controls", "autoplay", "loop", "muted", "poster",
  "scrolling", "sandbox", "target", "rel",
]);

const UNSAFE_URL_SCHEMES = /^(javascript|data|vbscript):/i;

export interface OEmbedProxyRequest {
  url: string;
  maxWidth?: number;
  maxHeight?: number;
  discover?: boolean;
}

export interface OEmbedProxyResponse {
  success: boolean;
  data?: {
    type: string;
    title?: string;
    authorName?: string;
    authorUrl?: string;
    providerName?: string;
    providerUrl?: string;
    html?: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  };
  error?: string;
}

export class OEmbedProxy {
  private resolver: OEmbedResolver;

  constructor(resolver: OEmbedResolver) {
    this.resolver = resolver;
  }

  async handleRequest(request: OEmbedProxyRequest): Promise<OEmbedProxyResponse> {
    if (!request.url) {
      return { success: false, error: "URL is required" };
    }

    try {
      new URL(request.url);
    } catch {
      return { success: false, error: "Invalid URL provided" };
    }

    const result = await this.resolver.resolve(request.url, request.maxWidth, request.maxHeight);

    if (!result) {
      return { success: false, error: "No oEmbed data found for this URL" };
    }

    const sanitizedHtml = result.html ? sanitizeProxyHtml(result.html) : undefined;

    const wrappedHtml = sanitizedHtml
      ? wrapResponsiveEmbed(sanitizedHtml, result.width, result.height)
      : undefined;

    return {
      success: true,
      data: {
        type: result.type,
        title: result.title,
        authorName: result.authorName,
        authorUrl: result.authorUrl,
        providerName: result.providerName,
        providerUrl: result.providerUrl,
        html: wrappedHtml,
        width: result.width,
        height: result.height,
        thumbnailUrl: result.thumbnailUrl,
      },
    };
  }

  async handleBulk(urls: string[]): Promise<OEmbedProxyResponse[]> {
    return Promise.all(urls.map((url) => this.handleRequest({ url })));
  }
}

function sanitizeProxyHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<(\/?)(\w+)([^>]*)>/g, (match, close, tag, attrs) => {
    const tagName = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tagName)) {
      return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

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

function wrapResponsiveEmbed(html: string, width?: number, height?: number): string {
  if (width && height && width > 0) {
    const ratio = (height / width) * 100;
    return `<div class="oembed-responsive" style="position:relative;overflow:hidden;padding-bottom:${ratio}%;height:0;max-width:100%">${html}</div>`;
  }
  return `<div class="oembed-wrapper" style="max-width:100%">${html}</div>`;
}
