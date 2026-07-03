import { Injectable } from '@nestjs/common';
import { SeoService } from '@nodepressjs/core/seo';
import { ContentService } from '../content/content.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SeoApiService {
  private seoService = new SeoService();

  constructor(
    private contentService: ContentService,
    private settingsService: SettingsService,
  ) {}

  async getSitemap(): Promise<string> {
    const entries = await this.contentService.findByType('post', 'publish');
    const settings = await this.settingsService.getGroup('general');
    const siteUrl = (settings?.values as any)?.siteUrl || 'http://localhost:3000';
    return this.seoService.generateSitemap(
      (entries as any).items?.map((e: any) => ({
        slug: e.slug,
        updatedAt: e.updatedAt,
        contentType: 'post',
      })) || [],
      siteUrl,
    );
  }

  async getRobotsTxt(): Promise<string> {
    const settings = await this.settingsService.getGroup('general');
    const siteUrl = (settings?.values as any)?.siteUrl || 'http://localhost:3000';
    return this.seoService.generateRobotsTxt(siteUrl, `${siteUrl}/sitemap.xml`);
  }

  async getMetaTags(entryId: string): Promise<string> {
    const entry = await this.contentService.findById(entryId);
    const settings = await this.settingsService.getGroup('seo');
    const generalSettings = await this.settingsService.getGroup('general');
    const siteUrl = (generalSettings?.values as any)?.siteUrl || 'http://localhost:3000';
    const seoDefaults = (settings?.values as any) || {};

    return this.seoService.generateMetaTags(
      entry as any,
      {
        metaTitle: (entry as any)?.seo?.metaTitle || seoDefaults.defaultMetaTitle,
        metaDescription: (entry as any)?.seo?.metaDescription || seoDefaults.defaultMetaDescription,
        ogImage: (entry as any)?.seo?.ogImage || seoDefaults.defaultOgImage,
      },
      siteUrl,
    );
  }
}
