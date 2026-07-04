import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstallService, type InstallDbInput, type InstallInput } from './install.service';
import { CheckDbDto } from './dto/check-db.dto';
import { SetupDto } from './dto/setup.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Install')
@Controller('install')
export class InstallController {
  constructor(private readonly installService: InstallService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check if NodePress is installed' })
  async getStatus() {
    return this.installService.getStatus();
  }

  @Public()
  @Post('test-db')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test database connection' })
  async testDatabase(@Body() dto: CheckDbDto) {
    return this.installService.testDatabaseConnection({
      host: dto.host,
      port: dto.port,
      name: dto.name,
      user: dto.user,
      password: dto.password,
    });
  }

  @Public()
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the full installation' })
  async runInstall(@Body() dto: SetupDto) {
    const input: InstallInput = {
      db: {
        host: dto.db.host,
        port: dto.db.port,
        name: dto.db.name,
        user: dto.db.user,
        password: dto.db.password,
      },
      site: {
        title: dto.site.title,
        description: dto.site.description,
        adminEmail: dto.admin.email,
        searchEngineVisibility: true,
        language: dto.site.language,
        timezone: dto.site.timezone,
        url: dto.site.url,
        permalink: dto.site.permalink,
      },
      admin: {
        username: dto.admin.username,
        password: dto.admin.password,
        firstName: dto.admin.firstName,
        lastName: dto.admin.lastName,
        avatar: dto.admin.avatar,
      },
      plugins: dto.plugins || [],
      theme: dto.theme || 'web-starter',
      installType: dto.installType || 'fresh',
    };

    return this.installService.runInstall(input);
  }

  @Public()
  @Post('generate-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate security keys and salts' })
  async generateKeys() {
    return this.installService.generateKeys();
  }

  @Public()
  @Get('db-env')
  @ApiOperation({ summary: 'Get database connection info from environment' })
  async getDbEnv() {
    const dbUrl = await this.installService.getDatabaseUrl();
    return { databaseUrl: dbUrl };
  }
}
