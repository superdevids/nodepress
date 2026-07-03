import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  token!: string;
}

@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate 2FA secret and backup codes' })
  async generate(@CurrentUser() user: JwtPayload) {
    return this.twoFactorService.generate(user.sub);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA setup with a token' })
  async verify(
    @Body() dto: Verify2faDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.twoFactorService.verify(user.sub, dto.token);
  }

  @Post('regenerate-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate backup codes' })
  async regenerateCodes(@CurrentUser() user: JwtPayload) {
    const codes = await this.twoFactorService.regenerateBackupCodes(user.sub);
    return { backupCodes: codes };
  }

  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable(@CurrentUser() user: JwtPayload) {
    await this.twoFactorService.disable(user.sub);
    return { disabled: true };
  }
}
