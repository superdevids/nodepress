export interface OEmbedProviderConfig {
  name: string;
  hostnames: string[];
  endpoint: string;
  format: "json" | "xml";
  patterns: RegExp[];
}

export interface OEmbedResult {
  type: "video" | "photo" | "link" | "rich";
  title?: string;
  authorName?: string;
  authorUrl?: string;
  providerName?: string;
  providerUrl?: string;
  html?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  url?: string;
  cacheAge?: number;
}

export class OEmbedRegistry {
  private providers: Map<string, OEmbedProviderConfig> = new Map();

  registerProvider(config: OEmbedProviderConfig): void {
    if (this.providers.has(config.name)) {
      throw new Error(`oEmbed provider "${config.name}" is already registered.`);
    }
    this.providers.set(config.name, config);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  getProvider(name: string): OEmbedProviderConfig | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): OEmbedProviderConfig[] {
    return Array.from(this.providers.values());
  }

  detectProvider(url: string): OEmbedProviderConfig | null {
    const urlObj = tryParseUrl(url);
    if (!urlObj) return null;

    for (const provider of this.providers.values()) {
      const matchesHost = provider.hostnames.some((h) => urlObj.hostname.includes(h));
      if (!matchesHost) continue;
      for (const pattern of provider.patterns) {
        if (pattern.test(url)) return provider;
      }
    }
    return null;
  }

  registerBuiltinProviders(): void {
    const providers: OEmbedProviderConfig[] = [
      {
        name: "YouTube",
        hostnames: ["youtube.com", "youtu.be"],
        endpoint: "https://www.youtube.com/oembed",
        format: "json",
        patterns: [/youtube\.com\/watch\?v=/, /youtu\.be\//, /youtube\.com\/embed\//, /youtube\.com\/shorts\//],
      },
      {
        name: "Twitter",
        hostnames: ["twitter.com", "x.com"],
        endpoint: "https://publish.twitter.com/oembed",
        format: "json",
        patterns: [/twitter\.com\/\w+\/status\//, /x\.com\/\w+\/status\//],
      },
      {
        name: "Vimeo",
        hostnames: ["vimeo.com"],
        endpoint: "https://vimeo.com/api/oembed.json",
        format: "json",
        patterns: [/vimeo\.com\/\d+/, /vimeo\.com\/channels\/[^/]+\/\d+/],
      },
      {
        name: "Spotify",
        hostnames: ["open.spotify.com"],
        endpoint: "https://open.spotify.com/oembed",
        format: "json",
        patterns: [/open\.spotify\.com\/(track|album|playlist|episode|show|artist)\//],
      },
      {
        name: "TikTok",
        hostnames: ["tiktok.com"],
        endpoint: "https://www.tiktok.com/oembed",
        format: "json",
        patterns: [/tiktok\.com\/@[\w.-]+\/video\//],
      },
      {
        name: "Instagram",
        hostnames: ["instagram.com", "instagr.am"],
        endpoint: "https://api.instagram.com/oembed",
        format: "json",
        patterns: [/instagram\.com\/p\//, /instagr\.am\/p\//, /instagram\.com\/reel\//],
      },
      {
        name: "SoundCloud",
        hostnames: ["soundcloud.com"],
        endpoint: "https://soundcloud.com/oembed",
        format: "json",
        patterns: [/soundcloud\.com\/[\w.-]+\/[\w.-]+/],
      },
      {
        name: "Flickr",
        hostnames: ["flickr.com", "flic.kr"],
        endpoint: "https://www.flickr.com/services/oembed",
        format: "json",
        patterns: [/flickr\.com\/photos\//, /flic\.kr\/p\//],
      },
      {
        name: "CodePen",
        hostnames: ["codepen.io"],
        endpoint: "https://codepen.io/api/oembed",
        format: "json",
        patterns: [/codepen\.io\/(?:team\/)?[\w-]+\/pen\//],
      },
    ];

    for (const p of providers) {
      this.registerProvider(p);
    }
  }
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
