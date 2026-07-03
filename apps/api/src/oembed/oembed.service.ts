import { Injectable, Logger } from '@nestjs/common';

export interface OEmbedResponse {
  type: 'rich' | 'video' | 'photo' | 'link';
  version: '1.0';
  title?: string;
  authorName?: string;
  authorUrl?: string;
  providerName: string;
  providerUrl: string;
  cacheAge?: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  html?: string;
  width?: number;
  height?: number;
}

interface ProviderConfig {
  name: string;
  url: string;
  endpoints: { schemes?: string[]; url: string; discovery?: boolean }[];
}

const KNOWN_PROVIDERS: ProviderConfig[] = [
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    endpoints: [
      {
        schemes: [
          'https://*.youtube.com/watch*',
          'https://*.youtube.com/v/*',
          'https://youtu.be/*',
          'https://*.youtube.com/playlist*',
          'https://*.youtube.com/shorts/*',
        ],
        url: 'https://www.youtube.com/oembed',
      },
    ],
  },
  {
    name: 'Vimeo',
    url: 'https://vimeo.com',
    endpoints: [{ schemes: ['https://vimeo.com/*', 'https://vimeo.com/*/*'], url: 'https://vimeo.com/api/oembed.json' }],
  },
  {
    name: 'Twitter / X',
    url: 'https://twitter.com',
    endpoints: [{ schemes: ['https://twitter.com/*', 'https://x.com/*'], url: 'https://publish.twitter.com/oembed' }],
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com',
    endpoints: [{ schemes: ['https://instagram.com/*', 'https://www.instagram.com/*'], url: 'https://graph.facebook.com/v12.0/instagram_oembed' }],
  },
  {
    name: 'Flickr',
    url: 'https://flickr.com',
    endpoints: [{ schemes: ['https://*.flickr.com/*'], url: 'https://www.flickr.com/services/oembed' }],
  },
  {
    name: 'TikTok',
    url: 'https://tiktok.com',
    endpoints: [{ schemes: ['https://www.tiktok.com/*'], url: 'https://www.tiktok.com/oembed' }],
  },
];

@Injectable()
export class OEmbedService {
  private readonly logger = new Logger(OEmbedService.name);
  private readonly cache = new Map<string, { data: OEmbedResponse; expiresAt: number }>();

  async fetch(url: string, _maxWidth?: number, _maxHeight?: number): Promise<OEmbedResponse> {
    this.logger.log(`oEmbed request: ${url}`);

    const cached = this.cache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const provider = this.findProvider(url);
    if (!provider) {
      const fallback: OEmbedResponse = {
        type: 'link',
        version: '1.0',
        providerName: 'NodePress',
        providerUrl: 'https://nodepress.local',
        title: url,
        cacheAge: 86400,
      };
      this.setCache(url, fallback, 86400);
      return fallback;
    }

    try {
      const endpoint = provider.endpoints[0];
      const apiUrl = new URL(endpoint.url);
      apiUrl.searchParams.set('url', url);
      apiUrl.searchParams.set('format', 'json');
      if (_maxWidth) apiUrl.searchParams.set('maxwidth', String(_maxWidth));
      if (_maxHeight) apiUrl.searchParams.set('maxheight', String(_maxHeight));

      const response = await fetch(apiUrl.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Provider returned ${response.status}`);
      }

      const raw: Record<string, unknown> = await response.json();
      const result: OEmbedResponse = {
        type: (raw.type as OEmbedResponse['type']) ?? 'link',
        version: '1.0',
        title: raw.title as string,
        authorName: raw.author_name as string,
        authorUrl: raw.author_url as string,
        providerName: (raw.provider_name as string) ?? provider.name,
        providerUrl: (raw.provider_url as string) ?? provider.url,
        cacheAge: (raw.cache_age as number) ?? 86400,
        thumbnailUrl: raw.thumbnail_url as string,
        thumbnailWidth: raw.thumbnail_width as number,
        thumbnailHeight: raw.thumbnail_height as number,
        html: raw.html as string,
        width: raw.width as number,
        height: raw.height as number,
      };

      const cacheAge = result.cacheAge ?? 86400;
      this.setCache(url, result, cacheAge);
      return result;
    } catch (err) {
      this.logger.warn(`oEmbed fetch failed for ${url}: ${(err as Error).message}`);
      const fallback: OEmbedResponse = {
        type: 'link',
        version: '1.0',
        providerName: provider.name,
        providerUrl: provider.url,
        title: url,
        cacheAge: 60,
      };
      return fallback;
    }
  }

  private findProvider(url: string): ProviderConfig | null {
    for (const provider of KNOWN_PROVIDERS) {
      for (const endpoint of provider.endpoints) {
        if (!endpoint.schemes || endpoint.schemes.length === 0) {
          return provider;
        }
        for (const scheme of endpoint.schemes) {
          const pattern = scheme
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          if (new RegExp(`^${pattern}$`).test(url)) {
            return provider;
          }
        }
      }
    }
    return null;
  }

  private setCache(url: string, data: OEmbedResponse, ageSeconds: number): void {
    this.cache.set(url, { data, expiresAt: Date.now() + ageSeconds * 1000 });
    if (this.cache.size > 500) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
  }
}
