import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@nodepress.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  applicationPassword?: string;

  @ApiProperty({ required: false, description: '2FA TOTP code' })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;

  @ApiProperty({ required: false, description: 'Extend session duration' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
