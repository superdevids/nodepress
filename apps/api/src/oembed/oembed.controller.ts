import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OEmbedService } from './oembed.service';

@ApiTags('OEmbed')
@Controller('oembed')
export class OEmbedController {
  constructor(private readonly oembedService: OEmbedService) {}

  @Get()
  @ApiOperation({ summary: 'Get oEmbed data for a URL' })
  @ApiQuery({ name: 'url', required: true, description: 'URL to fetch oEmbed for' })
  @ApiQuery({ name: 'maxwidth', required: false })
  @ApiQuery({ name: 'maxheight', required: false })
  async fetch(
    @Query('url') url: string,
    @Query('maxwidth') maxwidth?: string,
    @Query('maxheight') maxheight?: string,
  ) {
    return this.oembedService.fetch(
      url,
      maxwidth ? parseInt(maxwidth, 10) : undefined,
      maxheight ? parseInt(maxheight, 10) : undefined,
    );
  }
}
