import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';

class RecoveryLoginDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

@ApiTags('Recovery')
@Controller('recovery')
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with one-time recovery token' })
  async loginWithToken(@Body() dto: RecoveryLoginDto) {
    return this.recoveryService.loginWithToken(dto.token);
  }

  @Public()
  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate recovery mode' })
  async deactivate() {
    this.recoveryService.deactivate();
    return { success: true, message: 'Recovery mode deactivated' };
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check recovery mode status' })
  async status() {
    return {
      active: this.recoveryService.isInRecovery(),
      deactivatedPlugins: this.recoveryService.getDeactivatedPlugins(),
    };
  }
}
