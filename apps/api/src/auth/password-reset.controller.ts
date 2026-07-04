import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service';
import { Public } from '../common/decorators/public.decorator';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'NewStr0ng!Pass' })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}

@ApiTags('Password Reset')
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.requestReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.password, dto.confirmPassword);
  }

  @Public()
  @Get('verify-reset-token/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify whether a reset token is valid and not expired' })
  async verifyResetToken(@Param('token') token: string) {
    return this.passwordResetService.verifyToken(token);
  }
}
