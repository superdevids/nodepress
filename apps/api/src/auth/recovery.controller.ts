import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RecoveryMode } from '@nodepress/core';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

class RecoveryLoginDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

class EmergencyDeactivateDto {
  @ApiProperty()
  @IsString()
  slug!: string;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  private readonly recoveryMode = new RecoveryMode();

  constructor(private readonly prisma: PrismaService) {}

  isInRecovery(): boolean {
    return this.recoveryMode.isActive();
  }

  recordPluginError(slug: string, error: Error): boolean {
    return this.recoveryMode.recordPluginError(slug, error);
  }

  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const result = this.recoveryMode.generateRecoveryToken(userId);
    await this.prisma.recoveryToken.create({
      data: {
        userId,
        token: result.token,
        expiresAt: result.expiresAt,
      },
    });
    return result;
  }

  async loginWithToken(token: string): Promise<{ accessToken: string }> {
    const stored = await this.prisma.recoveryToken.findUnique({
      where: { token },
    });

    if (!stored) {
      throw new BadRequestException('Invalid recovery token');
    }
    if (new Date() > stored.expiresAt) {
      await this.prisma.recoveryToken.delete({ where: { id: stored.id } });
      throw new BadRequestException('Recovery token has expired');
    }
    if (stored.usedAt) {
      throw new BadRequestException('Recovery token has already been used');
    }

    await this.prisma.recoveryToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    this.recoveryMode.activate();
    this.logger.log(`Recovery mode activated by user ${stored.userId}`);

    return { accessToken: `recovery_${token}` };
  }

  deactivate(): void {
    this.recoveryMode.deactivate();
    this.recoveryMode.clearPluginErrors();
    this.logger.log('Recovery mode deactivated');
  }

  getDeactivatedPlugins(): string[] {
    return this.recoveryMode.getDeactivatedPlugins();
  }
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

  @Get('status')
  @ApiOperation({ summary: 'Check recovery mode status' })
  async status() {
    return {
      active: this.recoveryService.isInRecovery(),
      deactivatedPlugins: this.recoveryService.getDeactivatedPlugins(),
    };
  }
}
