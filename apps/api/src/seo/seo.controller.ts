import { Controller, Get, Param, Header } from '@nestjs/common';
import { SeoApiService } from './seo-api.service';

@Controller()
export class SeoController {
  constructor(private seoApiService: SeoApiService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemap(): Promise<string> {
    return this.seoApiService.getSitemap();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  async getRobotsTxt(): Promise<string> {
    return this.seoApiService.getRobotsTxt();
  }

  @Get('api/seo/meta/:entryId')
  async getMetaTags(@Param('entryId') entryId: string): Promise<{ html: string }> {
    const html = await this.seoApiService.getMetaTags(entryId);
    return { html };
  }
}
