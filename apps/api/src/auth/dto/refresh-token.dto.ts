import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
