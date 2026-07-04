import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InstallService } from './install.service';
import { CheckDbDto, AdminDto, SiteDto } from './dto/check-db.dto';
import { SetupDto } from './dto/setup.dto';
import { InstallStep1Dto } from './dto/step1.dto';
import { InstallStep2Dto } from './dto/step2.dto';
import { InstallStep3Dto } from './dto/step3.dto';
import { InstallStep4Dto } from './dto/step4.dto';
import { InstallStep5Dto } from './dto/step5.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Install')
@Public()
@Controller('install')
export class InstallController {
  private readonly logger = new Logger(InstallController.name);

  constructor(private readonly installService: InstallService) {}

  // ─── Status ──────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Check if NodePress is already installed' })
  @ApiResponse({
    status: 200,
    description: 'Returns installation status and DB connection state',
    schema: {
      type: 'object',
      properties: {
        installed: { type: 'boolean' },
        hasDbConnection: { type: 'boolean' },
      },
    },
  })
  async getStatus() {
    return this.installService.getStatus();
  }

  // ─── Step 1: Test Database Connection ────────────────────────

  @Post('step1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 1: Test database connection and save credentials' })
  @ApiResponse({
    status: 200,
    description: 'Database connection test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: { dbUrl: { type: 'string' } },
        },
        error: { type: 'string' },
      },
    },
  })
  async step1(@Body() dto: InstallStep1Dto) {
    return this.installService.step1TestDb({
      host: dto.host,
      port: dto.port,
      name: dto.name,
      user: dto.user,
      password: dto.password,
    });
  }

  // ─── Step 2: Create Admin Account ────────────────────────────

  @Post('step2')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 2: Set admin account credentials' })
  @ApiResponse({
    status: 200,
    description: 'Admin account data saved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async step2(@Body() dto: InstallStep2Dto) {
    return this.installService.step2Admin({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
  }

  // ─── Step 3: Save Site Settings ──────────────────────────────

  @Post('step3')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: Configure site settings' })
  @ApiResponse({
    status: 200,
    description: 'Site settings saved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            siteName: { type: 'string' },
            url: { type: 'string' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async step3(@Body() dto: InstallStep3Dto) {
    return this.installService.step3Site({
      siteName: dto.siteName,
      tagline: dto.tagline,
      url: dto.url,
      language: dto.language,
      timezone: dto.timezone,
    });
  }

  // ─── Step 4: Select & Activate Plugins ───────────────────────

  @Post('step4')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 4: Select plugins to activate' })
  @ApiResponse({
    status: 200,
    description: 'Plugin selection saved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            plugins: { type: 'array', items: { type: 'string' } },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async step4(@Body() dto: InstallStep4Dto) {
    return this.installService.step4Plugins({
      plugins: dto.plugins || [],
    });
  }

  // ─── Step 5: Select Theme ────────────────────────────────────

  @Post('step5')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 5: Select and finalize theme' })
  @ApiResponse({
    status: 200,
    description: 'Theme selection saved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async step5(@Body() dto: InstallStep5Dto) {
    return this.installService.step5Theme({
      theme: dto.theme,
    });
  }

  // ─── Complete Installation ───────────────────────────────────

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete installation — run migrations, seed data, return admin JWT' })
  @ApiResponse({
    status: 200,
    description: 'Installation completed successfully with admin JWT',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            adminUrl: { type: 'string' },
            accessToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        error: { type: 'string' },
      },
    },
  })
  async complete() {
    return this.installService.complete();
  }

  // ─── Legacy Endpoints (backward compat) ──────────────────────

  @Post('test-db')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Legacy] Test database connection' })
  async testDatabase(@Body() dto: CheckDbDto) {
    return this.installService.testDatabaseConnection({
      host: dto.host,
      port: dto.port,
      name: dto.name,
      user: dto.user,
      password: dto.password,
    });
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Legacy] Run full installation in one step' })
  async runInstall(@Body() dto: SetupDto) {
    return this.installService.runInstall({
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
    });
  }

  @Post('generate-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Legacy] Generate security keys and salts' })
  async generateKeys() {
    return this.installService.generateKeys();
  }

  @Get('db-env')
  @ApiOperation({ summary: '[Legacy] Get database connection info from environment' })
  async getDbEnv() {
    const dbUrl = await this.installService.getDatabaseUrl();
    return { databaseUrl: dbUrl };
  }

  // ─── Wizard Progress (utility) ───────────────────────────────

  @Get('progress')
  @ApiOperation({ summary: 'Get current wizard step completion progress' })
  async getProgress() {
    return this.installService.getWizardProgress();
  }
}
