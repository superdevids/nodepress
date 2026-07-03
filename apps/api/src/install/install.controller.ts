import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstallService, type InstallDbInput, type InstallInput } from './install.service';
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
  async testDatabase(@Body() db: InstallDbInput) {
    return this.installService.testDatabaseConnection(db);
  }

  @Public()
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the full installation' })
  async runInstall(@Body() input: InstallInput) {
    return this.installService.runInstall(input);
  }

  @Public()
  @Post('generate-keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate security keys and salts' })
  async generateKeys() {
    return this.installService.generateKeys();
  }
}
